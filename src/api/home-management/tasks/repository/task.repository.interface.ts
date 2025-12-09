import {
  CarTaskI,
  HouseTaskI,
  TaskI,
} from '@/api/home-management/entities/interfaces/home-management.entity';
import {
  CreateCarTaskDto,
  CreateHouseTaskDto,
  CreateTaskDto,
} from '@/api/home-management/entities/dtos/task.dto';
import { GenericRepository } from '@/common/repository/generic-repository.interface';

export const TASK_REPOSITORY = 'TASK_REPOSITORY';

export interface TaskRepository extends GenericRepository<
  TaskI,
  string,
  CreateTaskDto
> {
  toggleCompletedTask(taskID: string, taskCompleted: boolean): Promise<TaskI>;
  findHouseTasks(
    page: number,
    limit: number,
  ): Promise<{ entities: HouseTaskI[]; total: number }>;
  findCarTasks(
    page: number,
    limit: number,
  ): Promise<{ entities: CarTaskI[]; total: number }>;
  findAllHouseTasks(): Promise<{ entities: HouseTaskI[]; total: number }>;
  findAllCarTasks(): Promise<{ entities: CarTaskI[]; total: number }>;
  createHouseTask(dto: CreateHouseTaskDto): Promise<HouseTaskI>;
  createCarTask(dto: CreateCarTaskDto): Promise<CarTaskI>;
  deleteHouseTask(houseTaskID: string): Promise<void>;
  deleteCarTask(carTaskID: string): Promise<void>;
}
