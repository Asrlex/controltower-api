import { Inject, Logger, NotFoundException } from '@nestjs/common';
import {
    and,
    asc,
    between,
    count,
    desc,
    eq,
    gt,
    gte,
    like,
    lt,
    lte,
    or,
    SQL,
    sql,
} from 'drizzle-orm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import {
    ExpenseCategoryI,
    ExpenseI,
} from '@/api/home-management/entities/interfaces/home-management.entity';
import { SearchCriteriaI, SortI } from '@/api/entities/interfaces/api.entity';
import { CreateExpenseDto } from '@/api/home-management/entities/dtos/expense.dto';
import { ExpenseRepository } from './expenses.repository.interface';
import { DRIZZLE_DB } from '@/db/drizzle/drizzle.constants';
import { HomeManagementDrizzleDb } from '@/db/drizzle/drizzle.client';
import { expenseCategories, expenses } from '@/db/schema';
import { saveLogWithDb } from '@/common/utils/repository.utils';

export class ExpenseRepositoryImplementation implements ExpenseRepository {
    constructor(
        @Inject(DRIZZLE_DB)
        private readonly db: HomeManagementDrizzleDb,
        private readonly logger: Logger,
        @Inject(CACHE_MANAGER) private cacheManager: Cache,
    ) {}

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
        const result = await this.fetchExpenseRows();
        const entities: ExpenseI[] = this.resultToExpense(result);
        const [{ total }] = await this.db
            .select({ total: count(expenses.id) })
            .from(expenses);
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
        const entities = await this.db
            .select({
                categoryID: expenseCategories.id,
                categoryName: expenseCategories.name,
            })
            .from(expenseCategories)
            .orderBy(asc(expenseCategories.name));
        if (this.cacheManager) {
            await this.cacheManager.set(cacheKey, entities);
        }
        return entities;
    }

    /**
     * Método para obtener un gasto por su id
     * @param id - id del gasto
     * @returns string - gasto
     */
    async findById(id: string): Promise<ExpenseI> {
        const result = await this.fetchExpenseRows(eq(expenses.id, Number(id)));
        const entities: ExpenseI[] = this.resultToExpense(result);
        return entities.length > 0 ? entities[0] : null;
    }

    /**
     * Método para obtener un gasto por su mes
     * @param month - mes del gasto
     * @returns string - gasto
     */
    async findByMonth(month: string): Promise<ExpenseI[]> {
        const result = await this.fetchExpenseRows(
            eq(sql`strftime('%Y-%m', ${expenses.date})`, month),
            asc(expenses.date),
        );
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
        searchCriteria: SearchCriteriaI,
    ): Promise<{ entities: ExpenseI[]; total: number }> {
        const whereClause = this.buildWhereClause(searchCriteria);
        const orderBy = this.resolveSort(searchCriteria?.sort?.[0]);
        const offset = page * limit;
        const result = await this.fetchExpenseRows(
            whereClause,
            orderBy,
            limit,
            offset,
        );
        const entities: ExpenseI[] = this.resultToExpense(result);
        const totalQuery = this.db
            .select({ total: count(expenses.id) })
            .from(expenses)
            .leftJoin(
                expenseCategories,
                eq(expenseCategories.id, expenses.categoryId),
            );
        const [{ total }] = whereClause
            ? await totalQuery.where(whereClause)
            : await totalQuery;

        return {
            entities,
            total,
        };
    }

    /**
     * Método para crear un gasto
     * @param dto - dto del gasto
     * @returns string - gasto creado
     */
    async create(dto: CreateExpenseDto): Promise<ExpenseI> {
        const response = await this.db
            .insert(expenses)
            .values({
                amount: dto.expenseAmount,
                description: dto.expenseDescription,
                date: dto.expenseDate,
                categoryId: dto.categoryID,
            })
            .returning({ id: expenses.id });
        const expenseID = response[0].id;
        const expense: ExpenseI = await this.findById(String(expenseID));

        const cachedExpenses: {
            entities: ExpenseI[];
            total: number;
        } = await this.cacheManager.get('expenses');
        if (cachedExpenses) {
            cachedExpenses.entities.push(expense);
            cachedExpenses.total += 1;
            await this.cacheManager.set('expenses', cachedExpenses);
        }

        await saveLogWithDb(this.db, 'expense', `Created expense ${expenseID}`);
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

        await this.db
            .update(expenses)
            .set({
                amount: dto.expenseAmount,
                description: dto.expenseDescription,
                date: dto.expenseDate,
                categoryId: dto.categoryID,
            })
            .where(eq(expenses.id, Number(id)));
        const expense: ExpenseI = await this.findById(id);

        const cachedExpenses: {
            entities: ExpenseI[];
            total: number;
        } = await this.cacheManager.get('expenses');
        if (cachedExpenses) {
            const index = cachedExpenses.entities.findIndex(
                (e) => e.expenseID.toString() === id,
            );
            if (index !== -1) {
                cachedExpenses.entities[index] = expense;
                await this.cacheManager.set('expenses', cachedExpenses);
            }
        }

        await saveLogWithDb(this.db, 'expense', `Updated expense ${id}`);
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

        await this.db.delete(expenses).where(eq(expenses.id, Number(id)));

        const cachedExpenses: {
            entities: ExpenseI[];
            total: number;
        } = await this.cacheManager.get('expenses');
        if (cachedExpenses) {
            const index = cachedExpenses.entities.findIndex(
                (e) => e.expenseID.toString() === id,
            );
            if (index !== -1) {
                cachedExpenses.entities.splice(index, 1);
                cachedExpenses.total = Math.max(0, cachedExpenses.total - 1);
                await this.cacheManager.set('expenses', cachedExpenses);
            }
        }
        await saveLogWithDb(this.db, 'expense', `Deleted expense ${id}`);
    }

    /**
     * Método para convertir el resultado de la consulta a un objeto ExpenseI
     * @param result - resultado de la consulta
     * @returns string - objeto ExpenseI
     */
    private resultToExpense(result: ExpenseRow[]): ExpenseI[] {
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

    private async fetchExpenseRows(
        whereClause?: SQL,
        orderBy: SQL = desc(expenses.date),
        limit?: number,
        offset?: number,
    ): Promise<ExpenseRow[]> {
        const baseQuery = this.db
            .select({
                expenseID: expenses.id,
                expenseAmount: expenses.amount,
                expenseDescription: expenses.description,
                expenseDate: expenses.date,
                categoryID: expenseCategories.id,
                categoryName: expenseCategories.name,
            })
            .from(expenses)
            .leftJoin(
                expenseCategories,
                eq(expenseCategories.id, expenses.categoryId),
            );

        if (whereClause) {
            const orderedQuery = baseQuery.where(whereClause).orderBy(orderBy);
            if (limit !== undefined && offset !== undefined) {
                return orderedQuery.limit(limit).offset(offset);
            }
            if (limit !== undefined) {
                return orderedQuery.limit(limit);
            }
            return orderedQuery;
        }

        const orderedQuery = baseQuery.orderBy(orderBy);
        if (limit !== undefined && offset !== undefined) {
            return orderedQuery.limit(limit).offset(offset);
        }
        if (limit !== undefined) {
            return orderedQuery.limit(limit);
        }
        return orderedQuery;
    }

    private resolveSort(sort?: SortI): SQL {
        const order = sort?.order?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

        switch (sort?.field) {
            case 'expenseID':
                return order === 'ASC' ? asc(expenses.id) : desc(expenses.id);
            case 'expenseAmount':
                return order === 'ASC'
                    ? asc(expenses.amount)
                    : desc(expenses.amount);
            case 'expenseDescription':
                return order === 'ASC'
                    ? asc(expenses.description)
                    : desc(expenses.description);
            case 'categoryName':
                return order === 'ASC'
                    ? asc(expenseCategories.name)
                    : desc(expenseCategories.name);
            case 'expenseDate':
            default:
                return order === 'ASC'
                    ? asc(expenses.date)
                    : desc(expenses.date);
        }
    }

    private buildWhereClause(
        searchCriteria?: SearchCriteriaI,
    ): SQL | undefined {
        const conditions: SQL[] = [];

        searchCriteria?.filters?.forEach((filter) => {
            const condition = this.buildFilterCondition(filter);
            if (condition) {
                conditions.push(condition);
            }
        });

        if (searchCriteria?.search) {
            conditions.push(
                or(
                    like(expenses.description, `%${searchCriteria.search}%`),
                    like(expenseCategories.name, `%${searchCriteria.search}%`),
                ),
            );
        }

        if (conditions.length === 0) {
            return undefined;
        }

        return and(...conditions);
    }

    private buildFilterCondition(filter: {
        field?: string;
        operator?: string;
        value?: string;
    }): SQL | undefined {
        if (!filter?.field || !filter?.operator || filter.value === undefined) {
            return undefined;
        }

        const definition =
            filter.field === 'expenseID'
                ? { column: expenses.id, isNumeric: true }
                : filter.field === 'expenseAmount'
                  ? { column: expenses.amount, isNumeric: true }
                  : filter.field === 'expenseDescription'
                    ? { column: expenses.description, isNumeric: false }
                    : filter.field === 'expenseDate'
                      ? { column: expenses.date, isNumeric: false }
                      : filter.field === 'categoryID'
                        ? { column: expenseCategories.id, isNumeric: true }
                        : filter.field === 'categoryName'
                          ? { column: expenseCategories.name, isNumeric: false }
                          : null;

        if (!definition) {
            return undefined;
        }

        const operator = filter.operator.toLowerCase();
        const value = definition.isNumeric
            ? Number(filter.value)
            : filter.value;

        if (operator === '=') {
            return eq(definition.column, value as never);
        }
        if (operator === '>') {
            return gt(definition.column, value as never);
        }
        if (operator === '>=') {
            return gte(definition.column, value as never);
        }
        if (operator === '<') {
            return lt(definition.column, value as never);
        }
        if (operator === '<=') {
            return lte(definition.column, value as never);
        }
        if (operator === 'like' && !definition.isNumeric) {
            return like(definition.column, `%${filter.value}%`);
        }
        if (operator === 'between') {
            const [start, end] = filter.value.split(',');
            if (definition.isNumeric) {
                return between(definition.column, Number(start), Number(end));
            }
            return between(definition.column, start, end);
        }

        return undefined;
    }
}

interface ExpenseRow {
    expenseID: number;
    expenseAmount: number;
    expenseDescription: string;
    expenseDate: string;
    categoryID: number | null;
    categoryName: string | null;
}
