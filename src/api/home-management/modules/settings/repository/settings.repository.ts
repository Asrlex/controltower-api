/* eslint-disable @typescript-eslint/no-unused-vars */
import { Inject, Logger, NotFoundException } from '@nestjs/common';
import { count, eq } from 'drizzle-orm';
import { plainToInstance } from 'class-transformer';
import { SettingsI } from '@/api/home-management/entities/interfaces/home-management.entity';
import { CreateSettingsDto } from '@/api/home-management/entities/dtos/settings.dto';
import { SettingsRepository } from './settings.repository.interface';
import { DRIZZLE_DB } from '@/db/drizzle/drizzle.constants';
import { HomeManagementDrizzleDb } from '@/db/drizzle/drizzle.client';
import { settings } from '@/db/schema';
import { saveLogWithDb } from '@/common/utils/repository.utils';

export class SettingsRepositoryImplementation
  implements SettingsRepository
{
  constructor(
    @Inject(DRIZZLE_DB)
    private readonly db: HomeManagementDrizzleDb,
    private readonly logger: Logger,
  ) {}

  /**
   * Método para obtener todos los ajustes
   * @returns string - todos los ajustes
   */
  async findAll(): Promise<{
    entities: SettingsI[];
    total: number;
  }> {
    const entities = await this.db
      .select({
        settingsID: settings.id,
        settingsUserID: settings.userId,
        settings: settings.settings,
        settingsDateCreated: settings.createdAt,
        settingsLastModified: settings.lastModifiedAt,
      })
      .from(settings);
    const [{ total }] = await this.db
      .select({ total: count(settings.id) })
      .from(settings);
    return {
      entities,
      total,
    };
  }

  async find(
    page: number,
    limit: number,
    searchCriteria: any,
  ): Promise<{ entities: SettingsI[]; total: number }> {
    return null;
  }

  /**
   * Método para obtener ajustes por su id de usuario
   * @param id - id del usuario
   * @returns string
   */
  async findById(id: string): Promise<SettingsI | null> {
    const result = await this.db
      .select({
        settingsID: settings.id,
        settingsUserID: settings.userId,
        settings: settings.settings,
        settingsDateCreated: settings.createdAt,
        settingsLastModified: settings.lastModifiedAt,
      })
      .from(settings)
      .where(eq(settings.id, Number(id)))
      .limit(1);
    return result[0] ?? null;
  }

  /**
   * Metodo para crear un nuevo ajuste
   * @param dto - ajuste a crear
   * @returns string - ajuste creado
   */
  async create(dto: CreateSettingsDto): Promise<SettingsI> {
    dto = this.prepareDTO(dto);
    const response = await this.db
      .insert(settings)
      .values({
        settings: dto.settings,
        userId: dto.settingsUserID,
      })
      .returning({ id: settings.id });
    const settingsID = response[0].id;
    const newSettings = await this.findById(String(settingsID));

    await saveLogWithDb(this.db, 'settings', `Created settings ${settingsID}`);
    return newSettings;
  }

  /**
   * Método para actualizar un ajuste
   * Si el ajuste no existe, se devuelve null
   * Si el ajuste no tiene cambios, se devuelve el ajuste original
   * @param id - id del ajuste
   * @param settings - ajuste
   * @returns string - ajuste actualizado
   */
  async modify(id: string, dto: CreateSettingsDto): Promise<SettingsI> {
    const originalSettings = await this.findById(id);
    if (!originalSettings) {
      return this.create(dto);
    }
    dto = this.prepareDTO(dto);

    await this.db
      .update(settings)
      .set({
        settings: dto.settings,
      })
      .where(eq(settings.id, Number(id)));
    const updatedSettings = await this.findById(id);

    await saveLogWithDb(this.db, 'settings', `Modified settings ${id}`);
    return updatedSettings;
  }

  /**
   * Método para eliminar un ajuste
   * @param id - id del ajuste
   * @returns string - ajuste eliminado
   */
  async delete(id: string): Promise<void> {
    const originalSettings = await this.findById(id);
    if (!originalSettings) {
      throw new NotFoundException('Settings not found');
    }
    await this.db.delete(settings).where(eq(settings.id, Number(id)));

    await saveLogWithDb(this.db, 'settings', `Deleted settings ${id}`);
  }

  /**
   * Método para inicializar valores opcionales del DTO
   * @param dto - DTO
   * @returns DTO
   */
  private prepareDTO(dto: CreateSettingsDto): CreateSettingsDto {
    dto = plainToInstance(CreateSettingsDto, dto, {
      exposeDefaultValues: true,
    });
    return dto;
  }

  /**
   * Método para convertir el resultado de la consulta a un array de ajustes
   * @param result - resultado de la consulta
   * @returns array de ajustes
   */
}
