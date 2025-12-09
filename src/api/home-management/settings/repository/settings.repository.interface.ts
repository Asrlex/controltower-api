import { GenericRepository } from '@/common/repository/generic-repository.interface';
import { CreateSettingsDto } from '@/api/entities/dtos/home-management/settings.dto';
import { SettingsI } from '@/api/home-management/entities/interfaces/home-management.entity';

export const SETTINGS_REPOSITORY = 'SETTINGS_REPOSITORY';

export interface SettingsRepository extends GenericRepository<
  SettingsI,
  string,
  CreateSettingsDto
> {}
