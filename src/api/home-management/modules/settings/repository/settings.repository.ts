/* eslint-disable @typescript-eslint/no-unused-vars */
import { Inject, Logger, NotFoundException } from '@nestjs/common';
import { DatabaseConnection } from 'src/db/database.connection';
import { plainToInstance } from 'class-transformer';
import { SettingsI } from '@/api/home-management/entities/interfaces/home-management.entity';
import {
  CreateSettingsDto,
  GetSettingsDto,
} from '@/api/home-management/entities/dtos/settings.dto';
import { BaseRepository } from '@/common/repository/base-repository';
import { SettingsRepository } from './settings.repository.interface';
import { settingsQueries } from '@/db/queries/settings.queries';

export class SettingsRepositoryImplementation
  extends BaseRepository
  implements SettingsRepository
{
  constructor(
    @Inject('HOME_MANAGEMENT_CONNECTION')
    private readonly homeManagementDbConnection: DatabaseConnection,
    private readonly logger: Logger,
  ) {
    super(homeManagementDbConnection);
  }

  /**
   * Método para obtener todos los ajustes
   * @returns string - todos los ajustes
   */
  async findAll(): Promise<{
    entities: SettingsI[];
    total: number;
  }> {
    const sql = settingsQueries.findAll;
    const result = await this.homeManagementDbConnection.execute(sql);
    const entities: SettingsI[] = this.resultToSettings(result);
    const total = result[0] ? parseInt(result[0].total, 10) : 0;
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
    const sql = settingsQueries.findByID.replace('@id', id);
    const result = await this.homeManagementDbConnection.execute(sql);
    const entities: SettingsI[] = this.resultToSettings(result);
    return entities.length > 0 ? entities[0] : null;
  }

  /**
   * Metodo para crear un nuevo ajuste
   * @param dto - ajuste a crear
   * @returns string - ajuste creado
   */
  async create(dto: CreateSettingsDto): Promise<SettingsI> {
    dto = this.prepareDTO(dto);
    const sqlSettings = settingsQueries.create.replace(
      '@InsertValues',
      `'${dto.settings}', '${dto.settingsUserID}'`,
    );
    const responseSettings =
      await this.homeManagementDbConnection.execute(sqlSettings);
    const settingsID = responseSettings[0].id;
    const newSettings = await this.findById(settingsID);

    await this.saveLog('insert', 'settings', `Created settings ${settingsID}`);
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
      await this.create(dto);
    }
    dto = this.prepareDTO(dto);

    const sqlSettings = settingsQueries.update
      .replace('@settings', dto.settings)
      .replace('@id', id);
    await this.homeManagementDbConnection.execute(sqlSettings);
    const settings = await this.findById(id);

    await this.saveLog('update', 'settings', `Modified settings ${id}`);
    return settings;
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
    const sql = settingsQueries.delete.replace('@id', id);
    await this.homeManagementDbConnection.execute(sql);

    await this.saveLog('delete', 'settings', `Deleted settings ${id}`);
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
  private resultToSettings(result: GetSettingsDto[]): SettingsI[] {
    const mappedSettingss: Map<number, SettingsI> = new Map();
    result.forEach((record: GetSettingsDto) => {
      let settings: SettingsI;
      if (mappedSettingss.has(record.settingsID)) {
        settings = mappedSettingss.get(record.settingsID);
      } else {
        settings = {
          settingsID: record.settingsID,
          settingsUserID: record.settingsUserID,
          settings: record.settings,
          settingsDateCreated: record.settingsDateCreated,
          settingsLastModified: record.settingsLastModified,
        };
        mappedSettingss.set(record.settingsID, settings);
      }
    });
    return Array.from(mappedSettingss.values());
  }
}
