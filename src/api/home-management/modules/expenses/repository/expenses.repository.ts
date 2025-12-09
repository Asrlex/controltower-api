import { Inject, Logger, NotFoundException } from '@nestjs/common';
import { DatabaseConnection } from '@/db/database.connection';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import {
  ExpenseCategoryI,
  ExpenseI,
} from '@/api/home-management/entities/interfaces/home-management.entity';
import { SortI } from '@/api/entities/interfaces/api.entity';
import {
  CreateExpenseDto,
  GetExpenseDto,
} from '@/api/home-management/entities/dtos/expense.dto';
import { ExpenseRepository } from './expenses.repository.interface';
import { BaseRepository } from '@/common/repository/base-repository';
import { expensesQueries } from '@/db/queries/expenses.queries';

export class ExpenseRepositoryImplementation
  extends BaseRepository
  implements ExpenseRepository
{
  constructor(
    @Inject('HOME_MANAGEMENT_CONNECTION')
    private readonly homeManagementDbConnection: DatabaseConnection,
    private readonly logger: Logger,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {
    super(homeManagementDbConnection);
  }

  /**
   * Método para obtener todos los gastos
   * @returns string - todos los gastos
   */
  async findAll(): Promise<{
    entities: ExpenseI[];
    total: number;
  }> {
    const cacheKey = 'expenses';
    if (this.cacheManager) {
      const cachedExpenses: {
        entities: ExpenseI[];
        total: number;
      } = await this.cacheManager.get(cacheKey);
      if (cachedExpenses) {
        this.logger.log('Expenses cache hit');
        return cachedExpenses;
      }
    }
    const sql = expensesQueries.findAll;
    const result = await this.homeManagementDbConnection.execute(sql);
    const entities: ExpenseI[] = this.resultToExpense(result);
    const total = result[0] ? parseInt(result[0].total, 10) : 0;
    if (this.cacheManager) {
      await this.cacheManager.set(cacheKey, { entities, total });
    }
    return {
      entities,
      total,
    };
  }

  /**
   * Método para obtener todas las categorias de gastos
   * @returns string - todas las categorias de gastos
   */
  async findAllCategories(): Promise<ExpenseCategoryI[]> {
    const cacheKey = 'expensesCategories';
    if (this.cacheManager) {
      const cachedExpenses: ExpenseCategoryI[] =
        await this.cacheManager.get(cacheKey);
      if (cachedExpenses) {
        this.logger.log('Expenses cache hit');
        return cachedExpenses;
      }
    }
    const sql = expensesQueries.findAllCategories;
    const result = await this.homeManagementDbConnection.execute(sql);
    const entities: ExpenseI[] = this.resultToExpense(result);
    return entities;
  }

  /**
   * Método para obtener un gasto por su id
   * @param id - id del gasto
   * @returns string - gasto
   */
  async findById(id: string): Promise<ExpenseI> {
    const sql = expensesQueries.findByID.replace('@id', id);
    const result = await this.homeManagementDbConnection.execute(sql);
    const entities: ExpenseI[] = this.resultToExpense(result);
    return entities.length > 0 ? entities[0] : null;
  }

  /**
   * Método para obtener un gasto por su mes
   * @param month - mes del gasto
   * @returns string - gasto
   */
  async findByMonth(month: string): Promise<ExpenseI[]> {
    const sql = expensesQueries.findByMonth.replace('@id', `'${month}'`);
    const result = await this.homeManagementDbConnection.execute(sql);
    const entities: ExpenseI[] = this.resultToExpense(result);
    return entities;
  }

  /**
   * Método para obtener lista de gastos filtrados
   * @returns string - lista de gastos filtrados
   */
  async find(
    page: number,
    limit: number,
    searchCriteria: any,
  ): Promise<{ entities: ExpenseI[]; total: number }> {
    let filters = '';
    let sort: SortI = { field: 'productName', order: 'DESC' };
    if (searchCriteria) {
      const sqlFilters = this.filterstoSQL(searchCriteria);
      filters = this.addSearchToFilters(
        sqlFilters.filters,
        searchCriteria.search,
      );
      sort = sqlFilters.sort || sort;
    }
    const offset: number = page * limit + 1;
    limit = offset + parseInt(limit.toString(), 10) - 1;
    const sql = expensesQueries.find
      .replaceAll('@DynamicWhereClause', filters)
      .replaceAll('@DynamicOrderByField', `${sort.field}`)
      .replaceAll('@DynamicOrderByDirection', `${sort.order}`)
      .replace('@start', offset.toString())
      .replace('@end', limit.toString());
    const result = await this.homeManagementDbConnection.execute(sql);
    const entities: ExpenseI[] = this.resultToExpense(result);
    return {
      entities,
      total: result[0] ? parseInt(result[0].total, 10) : 0,
    };
  }

  /**
   * Método para crear un gasto
   * @param dto - dto del gasto
   * @returns string - gasto creado
   */
  async create(dto: CreateExpenseDto): Promise<ExpenseI> {
    const sql = expensesQueries.create.replace(
      '@InsertValues',
      `${dto.expenseAmount}, '${dto.expenseDescription}', '${dto.expenseDate}', '${dto.categoryID}'`,
    );
    console.log(sql);
    const response = await this.homeManagementDbConnection.execute(sql);
    console.log(response);
    const expenseID = response[0].id;
    const expense: ExpenseI = await this.findById(expenseID);

    const expenses: {
      entities: ExpenseI[];
      total: number;
    } = await this.cacheManager.get('expenses');
    if (expenses) {
      expenses.entities.push(expense);
      await this.cacheManager.set('expenses', expenses);
    }

    await this.saveLog('insert', 'expense', `Created expense ${expenseID}`);
    return expense;
  }

  /**
   * Método para modificar un gasto
   * @param id - id del gasto
   * @param dto - dto del gasto
   * @returns string - gasto modificado
   */
  async modify(id: string, dto: CreateExpenseDto): Promise<ExpenseI> {
    const originalExpense: ExpenseI = await this.findById(id);
    if (!originalExpense) {
      throw new NotFoundException(`Expense with id ${id} not found`);
    }

    const sql = expensesQueries.update
      .replace('@id', id)
      .replace(
        '@UpdateValues',
        `${dto.expenseAmount}, '${dto.expenseDescription}', '${dto.expenseDate}'`,
      );
    await this.homeManagementDbConnection.execute(sql);
    const expense: ExpenseI = await this.findById(id);

    const expenses: {
      entities: ExpenseI[];
      total: number;
    } = await this.cacheManager.get('expenses');
    if (expenses) {
      const index = expenses.entities.findIndex(
        (e) => e.expenseID.toString() === id,
      );
      if (index !== -1) {
        expenses.entities[index] = expense;
        await this.cacheManager.set('expenses', expenses);
      }
    }

    await this.saveLog('update', 'expense', `Updated expense ${id}`);
    return expense;
  }

  /**
   * Método para eliminar un gasto
   * @param id - id del gasto
   * @returns string - gasto eliminado
   */
  async delete(id: string): Promise<void> {
    const originalExpense: ExpenseI = await this.findById(id);
    if (!originalExpense) {
      throw new NotFoundException(`Expense with id ${id} not found`);
    }

    const sql = expensesQueries.delete.replace('@id', id);
    await this.homeManagementDbConnection.execute(sql);

    const expenses: {
      entities: ExpenseI[];
      total: number;
    } = await this.cacheManager.get('expenses');
    if (expenses) {
      const index = expenses.entities.findIndex(
        (e) => e.expenseID.toString() === id,
      );
      if (index !== -1) {
        expenses.entities.splice(index, 1);
        await this.cacheManager.set('expenses', expenses);
      }
    }
    await this.saveLog('delete', 'expense', `Deleted expense ${id}`);
  }

  /**
   * Método para convertir el resultado de la consulta a un objeto ExpenseI
   * @param result - resultado de la consulta
   * @returns string - objeto ExpenseI
   */
  private resultToExpense(result: GetExpenseDto[]): ExpenseI[] {
    const entities: ExpenseI[] = result.map((item) => {
      return {
        expenseID: item.expenseID,
        expenseAmount: item.expenseAmount,
        expenseDescription: item.expenseDescription,
        expenseDate: item.expenseDate,
        categoryID: item.categoryID,
        categoryName: item.categoryName,
      };
    });
    return entities;
  }

  /**
   * Método para añadir los criterios de búsqueda a los filtros
   * @param filters - filtros
   * @param search - criterios de búsqueda
   * @returns filtros con criterios de búsqueda
   */
  private addSearchToFilters(filters: string, search: string): string {
    if (search) {
      filters += ` 
        AND (expenseDescription LIKE '%${search}%'
        OR categoryName LIKE '%${search}%')
        `;
    }
    return filters;
  }
}
