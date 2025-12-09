import { CreateExpenseDto } from '@/api/home-management/entities/dtos/expense.dto';
import { SuccessCodes } from '@/api/entities/enums/response-codes.enum';
import { SearchCriteriaI } from '@/api/entities/interfaces/api.entity';
import {
  ExpenseCategoryI,
  ExpenseI,
} from '@/api/home-management/entities/interfaces/home-management.entity';
import { Inject, Injectable } from '@nestjs/common';
import {
  EXPENSE_REPOSITORY,
  ExpenseRepository,
} from './repository/expenses.repository.interface';

@Injectable()
export class ExpenseService {
  constructor(
    @Inject(EXPENSE_REPOSITORY)
    private readonly expenseRepository: ExpenseRepository,
  ) {}

  /**
   * Método para verificar si el endpoint de gastos esta funcionando
   * @returns string - mensaje indicando que el endpoint de gastos esta funcionando
   */
  async status() {
    return {
      statusCode: SuccessCodes.Ok,
      message: 'Expense endpoint is working',
    };
  }

  /**
   * Método para obtener todos los gastos
   * @returns string - todos los gastos
   */
  async findAllExpenses(): Promise<{
    entities: ExpenseI[];
    total: number;
  }> {
    return await this.expenseRepository.findAll();
  }

  /**
   * Método para obtener todas las categorias de gastos
   * @returns string - todas las categorias de gastos
   */
  async findAllExpenseCategories(): Promise<ExpenseCategoryI[]> {
    return await this.expenseRepository.findAllCategories();
  }

  /**
   * Método para obtener lista de gastos filtrados
   * @returns string - lista de gastos filtrados
   */
  async getExpenses(
    page: number,
    limit: number,
    searchCriteria: SearchCriteriaI,
  ): Promise<{
    entities: ExpenseI[];
    total: number;
  }> {
    return await this.expenseRepository.find(page, limit, searchCriteria);
  }

  /**
   * Método para obtener un gasto por su id
   * @param id - id del gasto
   * @returns string
   */
  async getExpenseById(id: string): Promise<ExpenseI> {
    return await this.expenseRepository.findById(id);
  }

  /**
   * Método para obtener un gasto por su mes
   * @param month - mes del gasto
   * @returns string
   */
  async getExpensesByMonth(month: string): Promise<ExpenseI[]> {
    return await this.expenseRepository.findByMonth(month);
  }

  /**
   * Método para crear un gasto
   * @param dto - dto del gasto
   * @returns string - gasto creado
   */
  async createExpense(dto: CreateExpenseDto): Promise<ExpenseI> {
    return await this.expenseRepository.create(dto);
  }

  /**
   * Método para modificar un gasto
   * @param id - id del gasto
   * @param dto - dto del gasto
   * @returns string - gasto modificado
   */
  async updateExpense(id: string, dto: CreateExpenseDto): Promise<ExpenseI> {
    return await this.expenseRepository.modify(id, dto);
  }

  /**
   * Método para eliminar un gasto
   * @param id - id del gasto
   * @returns string - gasto eliminado
   */
  async deleteExpense(id: string): Promise<void> {
    return await this.expenseRepository.delete(id);
  }
}
