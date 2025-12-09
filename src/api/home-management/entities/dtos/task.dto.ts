import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';
import { CarTaskTypes } from '../../../entities/enums/dto.enum';

export class CreateTaskDto {
  @ApiProperty({
    description: 'The ID of the task',
    example: 1,
    nullable: true,
  })
  @IsNumber()
  @IsOptional()
  taskID: number;
  @ApiProperty({
    description: 'The title of the task',
    example: 'Task Title',
    nullable: false,
  })
  @IsString()
  taskTitle: string;
  @ApiProperty({
    description: 'The description of the task',
    example: 'Task Description',
    nullable: false,
  })
  @IsString()
  taskDescription: string;
  @ApiProperty({
    description: 'Whether the task is completed or not',
    example: true,
    nullable: false,
  })
  @IsBoolean()
  @IsOptional()
  taskCompleted: boolean;
}

export class GetTaskDto {
  @IsNumber()
  taskID: number;
  @IsString()
  taskTitle: string;
  @IsString()
  taskDescription: string;
  @IsBoolean()
  taskCompleted: boolean;
  @IsString()
  taskCompletedAt: string;
  @IsString()
  taskDateCreated: string;
  @IsString()
  taskDateModified: string;
  @IsNumber()
  taskTagID: number;
  @IsString()
  taskTagName: string;
  @IsString()
  taskTagType: string;
}

export class CreateHouseTaskDto {
  @ApiProperty({
    description: 'The ID of the house task',
    example: 1,
    nullable: true,
  })
  @IsNumber()
  @IsOptional()
  houseTaskID: number;
  @ApiProperty({
    description: 'The name of the house task',
    example: 'House Task Name',
    nullable: false,
  })
  @IsString()
  houseTaskName: string;
}

export class GetHouseTaskDto {
  @IsNumber()
  houseTaskID: number;
  @IsString()
  houseTaskName: string;
  @IsString()
  houseTaskDate: string;
}

export class GetCarTaskDto {
  @IsNumber()
  carTaskID: number;
  @IsString()
  carTaskName: CarTaskTypes;
  @IsString()
  carTaskDetails: string;
  @IsNumber()
  carTaskCost: number;
  @IsString()
  carTaskDate: string;
}

export class CreateCarTaskDto {
  @IsNumber()
  @IsOptional()
  carTaskID?: number;
  @IsString()
  carTaskName: CarTaskTypes;
  @IsString()
  carTaskDetails: string;
  @IsNumber()
  carTaskCost: number;
  @IsString()
  carTaskDate: string;
}
