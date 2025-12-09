import { Module, Logger } from '@nestjs/common';
import { DatabaseModule } from '@/db/database.module';
import { TaskController } from './task.controller';
import { TaskService } from './task.service';
import { AuthModule } from '@/api/auth/auth.module';
import { TaskRepositoryImplementation } from './repository/task.repository';
import { TASK_REPOSITORY } from './repository/task.repository.interface';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [TaskController],
  providers: [
    {
      provide: TASK_REPOSITORY,
      useClass: TaskRepositoryImplementation,
    },
    TaskService,
    Logger,
  ],
})
export class TaskModule {}
