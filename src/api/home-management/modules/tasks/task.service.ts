import {
  CreateCarTaskDto,
  CreateHouseTaskDto,
  CreateTaskDto,
} from '@/api/home-management/entities/dtos/task.dto';
import { SuccessCodes } from '@/api/entities/enums/response-codes.enum';
import { SearchCriteriaI } from '@/api/entities/interfaces/api.entity';
import {
  CarTaskI,
  HouseTaskI,
  TaskI,
} from '@/api/home-management/entities/interfaces/home-management.entity';
import { Inject, Injectable } from '@nestjs/common';
import {
  TASK_REPOSITORY,
  TaskRepository,
} from './repository/task.repository.interface';

@Injectable()
export class TaskService {
  constructor(
    @Inject(TASK_REPOSITORY)
    private readonly taskRepository: TaskRepository,
  ) {}

  /**
   * Método para verificar si el endpoint de tareas esta funacionando
   * @returns string - mensaje indicando que el endpoint de tareas esta funacionando
   */
  async status() {
    return {
      statusCode: SuccessCodes.Ok,
      message: 'Task endpoint is working',
    };
  }

  /**
   * Método para obtener todos los tareas
   * @returns string - todos los tareas
   */
  async findAllTasks(): Promise<{
    entities: TaskI[];
    total: number;
  }> {
    return await this.taskRepository.findAll();
  }

  /**
   * Método para obtener todas las tareas de la casa
   * @returns string - todas las tareas de la casa
   */
  async findAllHouseTasks(): Promise<{
    entities: HouseTaskI[];
    total: number;
  }> {
    return await this.taskRepository.findAllHouseTasks();
  }

  /**
   * Método para obtener todas las tareas de la casa
   * @returns string - todas las tareas de la casa
   */
  async findAllCarTasks(): Promise<{
    entities: CarTaskI[];
    total: number;
  }> {
    return await this.taskRepository.findAllCarTasks();
  }

  /**
   * Método para obtener lista de tareas filtrados
   * @returns string - lista de tareas filtrados
   */
  async findTasks(
    page: number,
    limit: number,
    searchCriteria: SearchCriteriaI,
  ): Promise<{
    entities: TaskI[];
    total: number;
  }> {
    return await this.taskRepository.find(page, limit, searchCriteria);
  }

  /**
   * Método para obtener lista de tareas filtrados
   * @returns string - lista de tareas filtrados
   */
  async findHouseTasks(
    page: number,
    limit: number,
  ): Promise<{
    entities: HouseTaskI[];
    total: number;
  }> {
    return await this.taskRepository.findHouseTasks(page, limit);
  }

  /**
   * Método para obtener lista de tareas filtrados
   * @returns string - lista de tareas filtrados
   */
  async findCarTasks(
    page: number,
    limit: number,
  ): Promise<{
    entities: CarTaskI[];
    total: number;
  }> {
    return await this.taskRepository.findCarTasks(page, limit);
  }

  /**
   * Método para obtener una tarea por su id
   * @param id - id de la tarea
   * @returns string
   */
  async findById(id: string): Promise<TaskI> {
    return await this.taskRepository.findById(id);
  }

  /**
   * Metodo para crear una nueva tarea
   * @returns string - tarea creada
   */
  async createTask(dto: CreateTaskDto): Promise<TaskI> {
    return await this.taskRepository.create(dto);
  }

  /**
   * Metodo para crear una nueva tarea
   * @returns string - tarea creada
   */
  async createHouseTask(dto: CreateHouseTaskDto): Promise<HouseTaskI> {
    return await this.taskRepository.createHouseTask(dto);
  }

  /**
   * Metodo para crear una nueva tarea
   * @returns string - tarea creada
   */
  async createCarTask(dto: CreateCarTaskDto): Promise<CarTaskI> {
    return await this.taskRepository.createCarTask(dto);
  }

  /**
   * Método para actualizar una tarea
   * @param id - id de la tarea
   * @param customer - tarea
   * @returns string - tarea actualizada
   */
  async updateTask(id: string, customer: CreateTaskDto) {
    return await this.taskRepository.modify(id, customer);
  }

  /**
   * Método para actualizar una tarea completada
   * @param id - id de la tarea
   * @param customer - tarea
   * @returns string - tarea actualizada
   */
  async toggleCompletedTask(id: string, taskCompleted: boolean) {
    return await this.taskRepository.toggleCompletedTask(id, taskCompleted);
  }

  /**
   * Método para eliminar una tarea
   * @param id - id de la tarea
   * @returns null - tarea eliminada
   */
  async deleteTask(id: string) {
    await this.taskRepository.delete(id);
  }

  /**
   * Método para eliminar una tarea de la casa
   * @param id - id de la tarea
   * @returns null - tarea eliminada
   */
  async deleteHouseTask(id: string) {
    await this.taskRepository.deleteHouseTask(id);
  }

  /**
   * Método para eliminar una tarea del coche
   * @param id - id de la tarea
   * @returns null - tarea eliminada
   */
  async deleteCarTask(id: string) {
    await this.taskRepository.deleteCarTask(id);
  }
}
