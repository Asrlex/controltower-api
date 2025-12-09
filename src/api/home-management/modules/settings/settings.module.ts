import { DatabaseModule } from '@/db/database.module';
import { Logger, Module } from '@nestjs/common';
import { SettingService } from './settings.service';
import { SettingsController } from './settings.controller';
import { AuthModule } from '@/api/auth/auth.module';
import { SettingsRepositoryImplementation } from './repository/settings.repository';
import { SETTINGS_REPOSITORY } from './repository/settings.repository.interface';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [SettingsController],
  providers: [
    {
      provide: SETTINGS_REPOSITORY,
      useClass: SettingsRepositoryImplementation,
    },
    SettingService,
    Logger,
  ],
})
export class SettingsModule {}
