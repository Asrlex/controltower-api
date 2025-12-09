import { Module, Logger } from '@nestjs/common';
import { DatabaseModule } from '@/db/database.module';
import { AuthModule } from '@/api/auth/auth.module';
import { ShiftRepositoryImplementation } from './repository/shift.repository';
import { SHIFT_REPOSITORY } from './repository/shift.repository.interface';
import { ShiftController } from './shift.controller';
import { ShiftService } from './shift.service';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [ShiftController],
  providers: [
    {
      provide: SHIFT_REPOSITORY,
      useClass: ShiftRepositoryImplementation,
    },
    ShiftService,
    Logger,
  ],
})
export class ShiftModule {}
