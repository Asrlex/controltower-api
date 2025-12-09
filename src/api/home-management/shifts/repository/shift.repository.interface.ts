import {
  CreateAbsenceDto,
  CreateShiftCheckinDto,
} from '@/api/entities/dtos/home-management/shift.dto';
import {
  AbsenceI,
  ShiftI,
  UserI,
} from '@/api/home-management/entities/interfaces/home-management.entity';
import { GenericRepository } from '@/common/repository/generic-repository.interface';

export const SHIFT_REPOSITORY = 'SHIFT_REPOSITORY';

export interface ShiftRepository extends GenericRepository<
  ShiftI,
  string,
  CreateShiftCheckinDto
> {
  findByMonth(date: string, user: UserI): Promise<ShiftI[]>;
  findAllAbsences(user: UserI): Promise<AbsenceI[]>;
  createByUser(dto: CreateShiftCheckinDto, user: UserI): Promise<ShiftI>;
  createAbsence(dto: CreateAbsenceDto, user: UserI): Promise<void>;
  deleteAbsence(absenceId: string): Promise<void>;
}
