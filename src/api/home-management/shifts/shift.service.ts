import { SuccessCodes } from '@/api/entities/enums/response-codes.enum';
import { Inject, Injectable } from '@nestjs/common';
import {
  SHIFT_REPOSITORY,
  ShiftRepository,
} from './repository/shift.repository.interface';
import {
  AbsenceI,
  ShiftI,
  UserI,
} from '@/api/home-management/entities/interfaces/home-management.entity';
import {
  CreateAbsenceDto,
  CreateShiftCheckinDto,
} from '@/api/entities/dtos/home-management/shift.dto';

@Injectable()
export class ShiftService {
  constructor(
    @Inject(SHIFT_REPOSITORY)
    private readonly shiftRepository: ShiftRepository,
  ) {}

  /**
   * Método para verificar si el endpoint de tiendas esta funcionando
   * @returns string - mensaje indicando que el endpoint de tiendas esta funcionando
   */
  async status() {
    return {
      statusCode: SuccessCodes.Ok,
      message: 'Shift endpoint is working',
    };
  }

  /**
   * Método para obtener todos los turnos
   * @returns string - todos los turnos
   */
  async findAllShifts(): Promise<{
    entities: ShiftI[];
    total: number;
  }> {
    return await this.shiftRepository.findAll();
  }

  /**
   * Método para obtener todos los turnos
   * @returns string - todos los turnos
   */
  async findAllAbsences(user: UserI): Promise<AbsenceI[]> {
    return await this.shiftRepository.findAllAbsences(user);
  }

  /**
   * Método para obtener un turno por su id
   * @param id - id del turno
   * @returns string
   */
  async getShiftById(id: string): Promise<ShiftI> {
    return await this.shiftRepository.findById(id);
  }

  /**
   * Método para obtener turnos por su mes
   * @param date - mes del turno
   * @returns string - todos los turnos
   */
  async getShiftsByMonth(month: string, user: UserI): Promise<ShiftI[]> {
    return await this.shiftRepository.findByMonth(month, user);
  }

  /**
   * Metodo para crear un nuevo turno
   * @returns string - turno creado
   */
  async createShift(dto: CreateShiftCheckinDto, user: UserI): Promise<ShiftI> {
    return await this.shiftRepository.createByUser(dto, user);
  }

  /**
   * Método para crear una ausencia
   * @param dto - ausencia
   * @returns string - ausencia creada
   */
  async createAbsence(dto: CreateAbsenceDto, user: UserI): Promise<void> {
    await this.shiftRepository.createAbsence(dto, user);
  }

  /**
   * Método para actualizar un turno
   * @param id - id del turno
   * @param customer - turno
   * @returns string - turno actualizado
   */
  async updateShift(id: string, customer: CreateShiftCheckinDto) {
    return await this.shiftRepository.modify(id, customer);
  }

  /**
   * Método para eliminar un turno
   * @param id - id del turno
   * @returns null - turno eliminado
   */
  async deleteShift(id: string) {
    await this.shiftRepository.delete(id);
  }

  /**
   * Método para eliminar una ausencia
   * @param id - id de la ausencia
   * @returns null - ausencia eliminada
   */
  async deleteAbsence(id: string) {
    await this.shiftRepository.deleteAbsence(id);
  }
}
