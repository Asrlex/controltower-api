/* eslint-disable @typescript-eslint/no-unused-vars */
import { Inject, Logger, NotFoundException } from '@nestjs/common';
import { DatabaseConnection } from 'src/db/database.connection';
import { plainToInstance } from 'class-transformer';
import { BaseRepository } from '@/common/repository/base-repository';
import { ShiftRepository } from './shift.repository.interface';
import {
  AbsenceI,
  ShiftI,
  UserI,
} from '@/api/entities/interfaces/home-management.entity';
import { shiftQueries } from '@/db/queries/shifts.queries';
import {
  CreateAbsenceDto,
  CreateShiftCheckinDto,
  GetAbsenceDto,
  GetShiftCheckinDto,
} from '@/api/entities/dtos/home-management/shift.dto';

export class ShiftRepositoryImplementation
  extends BaseRepository
  implements ShiftRepository
{
  constructor(
    @Inject('HOME_MANAGEMENT_CONNECTION')
    private readonly homeManagementDbConnection: DatabaseConnection,
    private readonly logger: Logger,
  ) {
    super(homeManagementDbConnection);
  }

  /**
   * Método para obtener todos los turnos
   * @returns string - todos los turnos
   */
  async findAll(): Promise<{
    entities: ShiftI[];
    total: number;
  }> {
    const sql = shiftQueries.findAll;
    const result = await this.homeManagementDbConnection.execute(sql);
    const entities: ShiftI[] = this.resultToShift(result);
    return {
      entities,
      total: result[0] ? parseInt(result[0].total, 10) : 0,
    };
  }

  /**
   * Método para obtener todas las ausencias
   * @returns string - todas las ausencias
   */
  async findAllAbsences(user: UserI): Promise<AbsenceI[]> {
    const sql = shiftQueries.findAllAbsences.replaceAll(
      '@id',
      `'${user.userID.toString()}' OR user_id IS NULL`,
    );
    const result = await this.homeManagementDbConnection.execute(sql);
    const entities: AbsenceI[] = result.map((record: GetAbsenceDto) => ({
      absenceID: record.absenceID,
      absenceDate: record.absenceDate,
      absenceType: record.absenceType,
      absenceHours: record.absenceHours,
      absenceComment: record.absenceComment,
    }));
    return entities;
  }

  async find(
    page: number,
    limit: number,
    searchCriteria: any,
  ): Promise<{ entities: ShiftI[]; total: number }> {
    return null;
  }

  /**
   * Método para obtener un turno por su id
   * @param id - id del turno
   * @returns string
   */
  async findById(id: string): Promise<ShiftI | null> {
    const sql = shiftQueries.findByID.replace('@id', id);
    const result = await this.homeManagementDbConnection.execute(sql);
    const entities: ShiftI[] = this.resultToShift(result);
    return entities.length > 0 ? entities[0] : null;
  }

  /**
   * Método para obtener turnos por su mes
   * @param month - mes de los turnos
   * @returns string
   */
  async findByMonth(month: string, user: UserI): Promise<ShiftI[]> {
    const sql = shiftQueries.findByMonth.replace(
      '@id',
      `'${month}' AND user_id = '${user.userID}'`,
    );
    const result = await this.homeManagementDbConnection.execute(sql);
    const entities: ShiftI[] = this.resultToShift(result);
    return entities.length > 0 ? entities : null;
  }

  async create(dto: CreateShiftCheckinDto): Promise<ShiftI> {
    return null;
  }

  /**
   * Metodo para crear un nuevo turnos
   * @returns string - turno creado
   */
  async createByUser(dto: CreateShiftCheckinDto, user: UserI): Promise<ShiftI> {
    dto = this.prepareDTO(dto);
    const sqlProduct = shiftQueries.create.replace(
      '@InsertValues',
      `'${dto.shiftDate}', '${dto.shiftTimestamp}', '${dto.shiftType}', '${user.userID}'`,
    );
    const responseProduct =
      await this.homeManagementDbConnection.execute(sqlProduct);
    const shiftID = responseProduct[0].id;

    await this.saveLog('insert', 'shift', `Created shift ${shiftID}`);
    return this.findById(shiftID);
  }

  /**
   * Metodo para crear una nueva ausencia
   * @returns string - ausencia creada
   */
  async createAbsence(dto: CreateAbsenceDto, user: UserI): Promise<void> {
    const sqlProduct = shiftQueries.createAbsence.replace(
      '@InsertValues',
      `'${dto.absenceDate}', '${dto.absenceType}', '${dto.absenceHours}', '${dto.absenceComment}', '${user.userID}'`,
    );
    await this.homeManagementDbConnection.execute(sqlProduct);

    await this.saveLog('insert', 'absence', `Created absence`);
  }

  /**
   * Método para actualizar un turno
   * Si el turno no existe, se devuelve null
   * Si el turno no tiene cambios, se devuelve el turnos original
   * @param id - id del turno
   * @param product - turno
   * @returns string - turno actualizado
   */
  async modify(id: string, dto: CreateShiftCheckinDto): Promise<ShiftI> {
    const originalShift = await this.findById(id);
    if (!originalShift) {
      throw new NotFoundException('Shift ID not found');
    }
    dto = this.prepareDTO(dto);

    const sqlProduct = shiftQueries.update
      .replace('@date', dto.shiftDate)
      .replace('@timestamp', dto.shiftTimestamp)
      .replace('@type', dto.shiftType)
      .replace('@id', id);
    await this.homeManagementDbConnection.execute(sqlProduct);

    await this.saveLog('update', 'shift', `Modified shift ${id}`);
    return this.findById(id);
  }

  /**
   * Método para eliminar un turno
   * @param id - id del turno
   * @returns string - turno eliminado
   */
  async delete(id: string): Promise<void> {
    const originalShift = await this.findById(id);
    if (!originalShift) {
      throw new NotFoundException('Shift not found');
    }
    const sql = shiftQueries.delete.replace('@id', id);
    await this.homeManagementDbConnection.execute(sql);
    await this.saveLog('delete', 'shift', `Deleted shift ${id}`);
  }

  /**
   * Método para eliminar una ausencia
   * @param id - id de la ausencia
   * @returns string - ausencia eliminada
   */
  async deleteAbsence(id: string): Promise<void> {
    const sql = shiftQueries.deleteAbsence.replace('@id', id);
    await this.homeManagementDbConnection.execute(sql);
    await this.saveLog('delete', 'absence', `Deleted absence ${id}`);
  }

  /**
   * Método para inicializar valores opcionales del DTO
   * @param dto - DTO
   * @returns DTO
   */
  private prepareDTO(dto: CreateShiftCheckinDto): CreateShiftCheckinDto {
    dto = plainToInstance(CreateShiftCheckinDto, dto, {
      exposeDefaultValues: true,
    });
    return dto;
  }

  /**
   * Método para convertir el resultado de la consulta a un array de turnos
   * @param result - resultado de la consulta
   * @returns array de turnos
   */
  private resultToShift(result: GetShiftCheckinDto[]): ShiftI[] {
    const mappedShifts: Map<string, ShiftI> = new Map();
    result.forEach((record: GetShiftCheckinDto, index: number) => {
      let shift: ShiftI;
      if (mappedShifts.has(record.shiftDate)) {
        shift = mappedShifts.get(record.shiftDate);
      } else {
        shift = {
          shiftID: index,
          shiftDate: record.shiftDate,
          shiftTime: 0,
          shiftCheckins: [],
        };
        mappedShifts.set(shift.shiftDate, shift);
      }

      shift.shiftCheckins.push({
        shiftCheckinID: record.shiftID,
        shiftCheckinDate: record.shiftDate,
        shiftCheckinTimestamp: record.shiftTimestamp,
        shiftCheckinType: record.shiftType,
      });
    });

    mappedShifts.forEach((shift) => {
      shift.shiftCheckins.sort(
        (a, b) =>
          new Date(a.shiftCheckinTimestamp).getTime() -
          new Date(b.shiftCheckinTimestamp).getTime(),
      );

      for (let i = 0; i < shift.shiftCheckins.length; i += 2) {
        if (i + 1 < shift.shiftCheckins.length) {
          const clockIn = new Date(
            shift.shiftCheckins[i].shiftCheckinTimestamp,
          ).getTime();
          const clockOut = new Date(
            shift.shiftCheckins[i + 1].shiftCheckinTimestamp,
          ).getTime();
          shift.shiftTime += (clockOut - clockIn) / 1000;
        }
      }
    });

    return Array.from(mappedShifts.values());
  }
}
