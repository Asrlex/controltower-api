/* eslint-disable @typescript-eslint/no-unused-vars */
import { Inject, Logger, NotFoundException } from '@nestjs/common';
import { asc, count, eq, isNull, or, sql } from 'drizzle-orm';
import { plainToInstance } from 'class-transformer';
import { AbsenceTypes, ShiftTypes } from '@/api/entities/enums/dto.enum';
import { ShiftRepository } from './shift.repository.interface';
import {
  AbsenceI,
  ShiftI,
  UserI,
} from '@/api/home-management/entities/interfaces/home-management.entity';
import {
  CreateAbsenceDto,
  CreateShiftCheckinDto,
} from '@/api/home-management/entities/dtos/shift.dto';
import { DRIZZLE_DB } from '@/db/drizzle/drizzle.constants';
import { HomeManagementDrizzleDb } from '@/db/drizzle/drizzle.client';
import { absences, shifts } from '@/db/schema';
import { saveLogWithDb } from '@/common/utils/repository.utils';

export class ShiftRepositoryImplementation
  implements ShiftRepository
{
  constructor(
    @Inject(DRIZZLE_DB)
    private readonly db: HomeManagementDrizzleDb,
    private readonly logger: Logger,
  ) {}

  /**
   * Método para obtener todos los turnos
   * @returns string - todos los turnos
   */
  async findAll(): Promise<{
    entities: ShiftI[];
    total: number;
  }> {
    const result = await this.db
      .select({
        shiftID: shifts.id,
        shiftDate: shifts.date,
        shiftTimestamp: shifts.timestamp,
        shiftType: shifts.type,
      })
      .from(shifts)
      .orderBy(asc(shifts.date), asc(shifts.timestamp));
    const entities: ShiftI[] = this.resultToShift(result);
    const [{ total }] = await this.db
      .select({ total: count(shifts.id) })
      .from(shifts);
    return {
      entities,
      total,
    };
  }

  /**
   * Método para obtener todas las ausencias
   * @returns string - todas las ausencias
   */
  async findAllAbsences(user: UserI): Promise<AbsenceI[]> {
    const result = await this.db
      .select({
        absenceID: absences.id,
        absenceDate: absences.date,
        absenceType: absences.type,
        absenceHours: absences.hours,
        absenceComment: absences.comment,
      })
      .from(absences)
      .where(or(eq(absences.userId, user.userID), isNull(absences.userId)))
      .orderBy(asc(absences.date));

    return result.map((absence) => ({
      ...absence,
      absenceType: absence.absenceType as AbsenceTypes,
    }));
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
    const result = await this.db
      .select({
        shiftID: shifts.id,
        shiftDate: shifts.date,
        shiftTimestamp: shifts.timestamp,
        shiftType: shifts.type,
      })
      .from(shifts)
      .where(eq(shifts.id, Number(id)))
      .orderBy(asc(shifts.timestamp));
    const entities: ShiftI[] = this.resultToShift(result);
    return entities.length > 0 ? entities[0] : null;
  }

  /**
   * Método para obtener turnos por su mes
   * @param month - mes de los turnos
   * @returns string
   */
  async findByMonth(month: string, user: UserI): Promise<ShiftI[]> {
    const result = await this.db
      .select({
        shiftID: shifts.id,
        shiftDate: shifts.date,
        shiftTimestamp: shifts.timestamp,
        shiftType: shifts.type,
      })
      .from(shifts)
      .where(
        sql`strftime('%Y-%m', ${shifts.date}) = ${month} AND ${shifts.userId} = ${user.userID}`,
      )
      .orderBy(asc(shifts.date), asc(shifts.timestamp));
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
    const response = await this.db
      .insert(shifts)
      .values({
        date: dto.shiftDate,
        timestamp: dto.shiftTimestamp,
        type: dto.shiftType,
        userId: user.userID,
      })
      .returning({ id: shifts.id });
    const shiftID = response[0].id;

    await saveLogWithDb(this.db, 'shift', `Created shift ${shiftID}`);
    return this.findById(String(shiftID));
  }

  /**
   * Metodo para crear una nueva ausencia
   * @returns string - ausencia creada
   */
  async createAbsence(dto: CreateAbsenceDto, user: UserI): Promise<void> {
    await this.db.insert(absences).values({
      date: dto.absenceDate,
      type: dto.absenceType,
      hours: Number(dto.absenceHours),
      comment: dto.absenceComment,
      userId: user.userID,
    });

    await saveLogWithDb(this.db, 'absence', `Created absence`);
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

    await this.db
      .update(shifts)
      .set({
        date: dto.shiftDate,
        timestamp: dto.shiftTimestamp,
        type: dto.shiftType,
      })
      .where(eq(shifts.id, Number(id)));

    await saveLogWithDb(this.db, 'shift', `Modified shift ${id}`);
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
    await this.db.delete(shifts).where(eq(shifts.id, Number(id)));
    await saveLogWithDb(this.db, 'shift', `Deleted shift ${id}`);
  }

  /**
   * Método para eliminar una ausencia
   * @param id - id de la ausencia
   * @returns string - ausencia eliminada
   */
  async deleteAbsence(id: string): Promise<void> {
    await this.db.delete(absences).where(eq(absences.id, Number(id)));
    await saveLogWithDb(this.db, 'absence', `Deleted absence ${id}`);
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
  private resultToShift(result: ShiftRow[]): ShiftI[] {
    const mappedShifts: Map<string, ShiftI> = new Map();
    result.forEach((record: ShiftRow, index: number) => {
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
        shiftCheckinType: record.shiftType as ShiftTypes,
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

interface ShiftRow {
  shiftID: number;
  shiftDate: string;
  shiftTimestamp: string;
  shiftType: string;
}
