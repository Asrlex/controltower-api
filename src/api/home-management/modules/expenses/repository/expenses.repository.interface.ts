import { GenericRepository } from '@/common/repository/generic-repository.interface';
import { CreateExpenseDto } from '@/api/home-management/entities/dtos/expense.dto';
import {
    ExpenseCategoryI,
    ExpenseI,
} from '@/api/home-management/entities/interfaces/home-management.entity';

export const EXPENSE_REPOSITORY = 'EXPENSE_REPOSITORY';

export interface ExpenseRepository extends GenericRepository<
    ExpenseI,
    string,
    CreateExpenseDto
> {
    findAllCategories(): Promise<ExpenseCategoryI[]>;
    findByMonth(month: string): Promise<ExpenseI[]>;
}
