import { AuthModule } from '@/api/auth/auth.module';
import { DatabaseModule } from '@/db/database.module';
import { Logger, Module } from '@nestjs/common';
import { ExpenseController } from './expenses.controller';
import { ExpenseService } from './expenses.service';
import { ExpenseRepositoryImplementation } from './repository/expenses.repository';
import { EXPENSE_REPOSITORY } from './repository/expenses.repository.interface';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [ExpenseController],
  providers: [
    {
      provide: EXPENSE_REPOSITORY,
      useClass: ExpenseRepositoryImplementation,
    },
    ExpenseService,
    Logger,
  ],
})
export class ExpenseModule {}
