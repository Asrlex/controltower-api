import { IsNumber, IsString } from 'class-validator';
import { AbsenceTypes, ShiftTypes } from '../../../entities/enums/dto.enum';

export class GetShiftCheckinDto {
  @IsNumber()
  shiftID: number;
  @IsString()
  shiftDate: string;
  @IsString()
  shiftTimestamp: string;
  @IsString()
  shiftType: ShiftTypes;
}

export class CreateShiftCheckinDto {
  @IsString()
  shiftDate: string;
  @IsString()
  shiftTimestamp: string;
  @IsString()
  shiftType: ShiftTypes;
}

export class GetAbsenceDto {
  @IsNumber()
  absenceID: number;
  @IsString()
  absenceDate: string;
  @IsString()
  absenceType: AbsenceTypes;
  @IsString()
  absenceComment: string;
  @IsNumber()
  absenceHours: string;
}

export class CreateAbsenceDto {
  @IsString()
  absenceDate: string;
  @IsString()
  absenceType: AbsenceTypes;
  @IsString()
  absenceComment: string;
  @IsNumber()
  absenceHours: string;
}
