import { Inject, Logger, NotFoundException } from '@nestjs/common';
import {
  and,
  asc,
  between,
  count,
  desc,
  eq,
  gt,
  gte,
  inArray,
  like,
  lt,
  lte,
  SQL,
} from 'drizzle-orm';
import { SearchCriteriaI, SortI } from 'src/api/entities/interfaces/api.entity';
import { plainToInstance } from 'class-transformer';
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
import { TaskRepository } from './task.repository.interface';
import { DRIZZLE_DB } from '@/db/drizzle/drizzle.constants';
import { HomeManagementDrizzleDb } from '@/db/drizzle/drizzle.client';
import { carTasks, houseTasks, tags, taskTags, tasks } from '@/db/schema';
import { saveLogWithDb } from '@/common/utils/repository.utils';
import { CarTaskTypes } from '@/api/entities/enums/dto.enum';

export class TaskRepositoryImplementation implements TaskRepository {
  constructor(
    @Inject(DRIZZLE_DB)
    private readonly db: HomeManagementDrizzleDb,
    private readonly logger: Logger,
  ) {}

  async findAll(): Promise<{
    entities: TaskI[];
    total: number;
  }> {
    const result = await this.fetchTaskRows();
    const entities = this.resultToTask(result);
    const [{ total }] = await this.db
      .select({ total: count(tasks.id) })
      .from(tasks);
    return { entities, total };
  }

  async findAllHouseTasks(): Promise<{
    entities: HouseTaskI[];
    total: number;
  }> {
    const entities = await this.db
      .select({
        houseTaskID: houseTasks.id,
        houseTaskName: houseTasks.name,
        houseTaskDate: houseTasks.date,
      })
      .from(houseTasks)
      .orderBy(desc(houseTasks.id));
    const [{ total }] = await this.db
      .select({ total: count(houseTasks.id) })
      .from(houseTasks);
    return { entities, total };
  }

  async findAllCarTasks(): Promise<{
    entities: CarTaskI[];
    total: number;
  }> {
    const entities = await this.fetchCarTaskRows();
    const [{ total }] = await this.db
      .select({ total: count(carTasks.id) })
      .from(carTasks);
    return { entities, total };
  }

  async find(
    page: number,
    limit: number,
    searchCriteria: SearchCriteriaI,
  ): Promise<{ entities: TaskI[]; total: number }> {
    const whereClause = this.buildWhereClause(searchCriteria);
    const orderBy = this.resolveSort(searchCriteria?.sort?.[0]);
    const offset = page * limit;

    const idsQuery = this.db.select({ id: tasks.id }).from(tasks);
    const scopedIdsQuery = whereClause ? idsQuery.where(whereClause) : idsQuery;
    const paginatedTasks = await scopedIdsQuery
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset);
    const taskIds = paginatedTasks.map((task) => task.id);
    const result = taskIds.length > 0 ? await this.fetchTaskRows(taskIds, orderBy) : [];
    const entities = this.resultToTask(result);

    const totalQuery = this.db.select({ total: count(tasks.id) }).from(tasks);
    const [{ total }] = whereClause
      ? await totalQuery.where(whereClause)
      : await totalQuery;

    return { entities, total };
  }

  async findHouseTasks(
    page: number,
    limit: number,
  ): Promise<{ entities: HouseTaskI[]; total: number }> {
    const offset = page * limit;
    const entities = await this.db
      .select({
        houseTaskID: houseTasks.id,
        houseTaskName: houseTasks.name,
        houseTaskDate: houseTasks.date,
      })
      .from(houseTasks)
      .orderBy(desc(houseTasks.id))
      .limit(limit)
      .offset(offset);
    const [{ total }] = await this.db
      .select({ total: count(houseTasks.id) })
      .from(houseTasks);
    return { entities, total };
  }

  async findCarTasks(
    page: number,
    limit: number,
  ): Promise<{ entities: CarTaskI[]; total: number }> {
    const offset = page * limit;
    const entities = await this.fetchCarTaskRows(limit, offset);
    const [{ total }] = await this.db
      .select({ total: count(carTasks.id) })
      .from(carTasks);
    return { entities, total };
  }

  async findById(id: string): Promise<TaskI | null> {
    const result = await this.fetchTaskRows([Number(id)]);
    const entities = this.resultToTask(result);
    return entities[0] ?? null;
  }

  async findHouseTaskById(id: string): Promise<HouseTaskI | null> {
    const result = await this.db
      .select({
        houseTaskID: houseTasks.id,
        houseTaskName: houseTasks.name,
        houseTaskDate: houseTasks.date,
      })
      .from(houseTasks)
      .where(eq(houseTasks.id, Number(id)))
      .limit(1);
    return result[0] ?? null;
  }

  async findCarTaskById(id: string): Promise<CarTaskI | null> {
    const result = await this.db
      .select({
        carTaskID: carTasks.id,
        carTaskName: carTasks.name,
        carTaskDetails: carTasks.details,
        carTaskCost: carTasks.cost,
        carTaskDate: carTasks.date,
      })
      .from(carTasks)
      .where(eq(carTasks.id, Number(id)))
      .limit(1);
    return result[0]
      ? {
          ...result[0],
          carTaskName: result[0].carTaskName as CarTaskTypes,
        }
      : null;
  }

  async create(dto: CreateTaskDto): Promise<TaskI> {
    dto = this.prepareDTO(dto);
    const result = await this.db
      .insert(tasks)
      .values({
        title: dto.taskTitle,
        description: dto.taskDescription,
        completed: dto.taskCompleted ?? false,
      })
      .returning({ id: tasks.id });
    const taskID = result[0].id;

    await saveLogWithDb(this.db, 'task', `Created task ${taskID}`);
    return this.findById(String(taskID));
  }

  async createHouseTask(dto: CreateHouseTaskDto): Promise<HouseTaskI> {
    const result = await this.db
      .insert(houseTasks)
      .values({
        name: dto.houseTaskName,
      })
      .returning({ id: houseTasks.id });
    const task = await this.findHouseTaskById(String(result[0].id));

    await saveLogWithDb(this.db, 'house-task', `Created task ${task.houseTaskID}`);
    return task;
  }

  async createCarTask(dto: CreateCarTaskDto): Promise<CarTaskI> {
    const result = await this.db
      .insert(carTasks)
      .values({
        name: dto.carTaskName,
        details: dto.carTaskDetails,
        cost: dto.carTaskCost,
        date: dto.carTaskDate,
      })
      .returning({ id: carTasks.id });
    const task = await this.findCarTaskById(String(result[0].id));

    await saveLogWithDb(this.db, 'car-task', `Created task ${task.carTaskID}`);
    return task;
  }

  async modify(id: string, dto: CreateTaskDto): Promise<TaskI> {
    const originalTask = await this.findById(id);
    if (!originalTask) {
      throw new NotFoundException('Task not found');
    }
    dto = this.prepareDTO(dto);

    await this.db
      .update(tasks)
      .set({
        title: dto.taskTitle,
        description: dto.taskDescription,
      })
      .where(eq(tasks.id, Number(id)));

    await saveLogWithDb(this.db, 'task', `Modified task ${id}`);
    return this.findById(id);
  }

  async toggleCompletedTask(
    id: string,
    taskCompleted: string | boolean,
  ): Promise<TaskI> {
    const originalTask = await this.findById(id);
    if (!originalTask) {
      throw new NotFoundException('Task not found');
    }

    const isCompleted = taskCompleted === true || taskCompleted === 'true';
    await this.db
      .update(tasks)
      .set({
        completed: isCompleted,
        completedAt: isCompleted ? new Date().toISOString() : null,
      })
      .where(eq(tasks.id, Number(id)));

    await saveLogWithDb(this.db, 'task', `Modified task ${id}`);
    return this.findById(id);
  }

  async delete(id: string): Promise<void> {
    const originalTask = await this.findById(id);
    if (!originalTask) {
      throw new NotFoundException('Task not found');
    }
    await this.db.delete(tasks).where(eq(tasks.id, Number(id)));
    await saveLogWithDb(this.db, 'task', `Deleted task ${id}`);
  }

  async deleteHouseTask(houseTaskID: string): Promise<void> {
    const originalTask = await this.findHouseTaskById(houseTaskID);
    if (!originalTask) {
      throw new NotFoundException('Task not found');
    }
    await this.db.delete(houseTasks).where(eq(houseTasks.id, Number(houseTaskID)));
    await saveLogWithDb(this.db, 'house-task', `Deleted task ${houseTaskID}`);
  }

  async deleteCarTask(id: string): Promise<void> {
    const originalTask = await this.findCarTaskById(id);
    if (!originalTask) {
      throw new NotFoundException('Task not found');
    }
    await this.db.delete(carTasks).where(eq(carTasks.id, Number(id)));
    await saveLogWithDb(this.db, 'car-task', `Deleted task ${id}`);
  }

  private prepareDTO(dto: CreateTaskDto): CreateTaskDto {
    return plainToInstance(CreateTaskDto, dto, {
      exposeDefaultValues: true,
    });
  }

  private resultToTask(result: TaskRow[]): TaskI[] {
    const mappedTask: Map<number, TaskI> = new Map();
    result.forEach((record) => {
      let task: TaskI;
      if (mappedTask.has(record.taskID)) {
        task = mappedTask.get(record.taskID);
      } else {
        task = {
          taskID: record.taskID,
          taskTitle: record.taskTitle,
          taskDescription: record.taskDescription,
          taskCompleted: Boolean(record.taskCompleted),
          taskCompletedAt: record.taskCompletedAt,
          taskDateCreated: record.taskDateCreated,
          taskDateModified: record.taskDateModified,
          tags: [],
        };
        mappedTask.set(record.taskID, task);
      }

      if (record.taskTagID && !task.tags.some((tag) => tag.tagID === record.taskTagID)) {
        task.tags.push({
          tagID: record.taskTagID,
          tagName: record.taskTagName,
          tagType: record.taskTagType,
        });
      }
    });
    return Array.from(mappedTask.values());
  }

  private async fetchTaskRows(taskIds?: number[], orderBy?: SQL): Promise<TaskRow[]> {
    const query = this.db
      .select({
        taskID: tasks.id,
        taskTitle: tasks.title,
        taskDescription: tasks.description,
        taskCompleted: tasks.completed,
        taskCompletedAt: tasks.completedAt,
        taskDateCreated: tasks.createdAt,
        taskDateModified: tasks.lastModifiedAt,
        taskTagID: tags.id,
        taskTagName: tags.name,
        taskTagType: tags.type,
      })
      .from(tasks)
      .leftJoin(taskTags, eq(taskTags.taskId, tasks.id))
      .leftJoin(tags, eq(tags.id, taskTags.tagId));

    const scopedQuery = taskIds?.length ? query.where(inArray(tasks.id, taskIds)) : query;
    return scopedQuery.orderBy(orderBy ?? desc(tasks.title));
  }

  private async fetchCarTaskRows(limit?: number, offset?: number): Promise<CarTaskI[]> {
    const query = this.db
      .select({
        carTaskID: carTasks.id,
        carTaskName: carTasks.name,
        carTaskDetails: carTasks.details,
        carTaskCost: carTasks.cost,
        carTaskDate: carTasks.date,
      })
      .from(carTasks)
      .orderBy(desc(carTasks.id));

    const rows = limit !== undefined ? await query.limit(limit).offset(offset ?? 0) : await query;
    return rows.map((row) => ({
      ...row,
      carTaskName: row.carTaskName as CarTaskTypes,
    }));
  }

  private resolveSort(sort?: SortI): SQL {
    const order = sort?.order?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    switch (sort?.field) {
      case 'taskID':
        return order === 'ASC' ? asc(tasks.id) : desc(tasks.id);
      case 'taskCompleted':
        return order === 'ASC' ? asc(tasks.completed) : desc(tasks.completed);
      case 'taskCompletedAt':
        return order === 'ASC' ? asc(tasks.completedAt) : desc(tasks.completedAt);
      case 'taskDateCreated':
        return order === 'ASC' ? asc(tasks.createdAt) : desc(tasks.createdAt);
      case 'taskDateModified':
        return order === 'ASC' ? asc(tasks.lastModifiedAt) : desc(tasks.lastModifiedAt);
      case 'taskTitle':
      default:
        return order === 'ASC' ? asc(tasks.title) : desc(tasks.title);
    }
  }

  private buildWhereClause(searchCriteria?: SearchCriteriaI): SQL | undefined {
    const conditions: SQL[] = [];
    searchCriteria?.filters?.forEach((filter) => {
      const condition = this.buildFilterCondition(filter);
      if (condition) {
        conditions.push(condition);
      }
    });

    if (searchCriteria?.search) {
      conditions.push(like(tasks.title, `%${searchCriteria.search}%`));
    }

    return conditions.length > 0 ? and(...conditions) : undefined;
  }

  private buildFilterCondition(filter: {
    field?: string;
    operator?: string;
    value?: string;
  }): SQL | undefined {
    if (!filter?.field || !filter?.operator || filter.value === undefined) {
      return undefined;
    }

    const definition =
      filter.field === 'taskID'
        ? { column: tasks.id, isNumeric: true }
        : filter.field === 'taskTitle'
          ? { column: tasks.title, isNumeric: false }
          : filter.field === 'taskDescription'
            ? { column: tasks.description, isNumeric: false }
            : filter.field === 'taskCompleted'
              ? { column: tasks.completed, isNumeric: false }
              : filter.field === 'taskCompletedAt'
                ? { column: tasks.completedAt, isNumeric: false }
                : filter.field === 'taskDateCreated'
                  ? { column: tasks.createdAt, isNumeric: false }
                  : filter.field === 'taskDateModified'
                    ? { column: tasks.lastModifiedAt, isNumeric: false }
                    : null;

    if (!definition) {
      return undefined;
    }

    const operator = filter.operator.toLowerCase();
    const value = definition.isNumeric ? Number(filter.value) : filter.value;

    if (operator === '=') {
      if (filter.field === 'taskCompleted') {
        return eq(tasks.completed, filter.value === 'true' || filter.value === '1');
      }
      return eq(definition.column, value as never);
    }
    if (operator === '>') {
      return gt(definition.column, value as never);
    }
    if (operator === '>=') {
      return gte(definition.column, value as never);
    }
    if (operator === '<') {
      return lt(definition.column, value as never);
    }
    if (operator === '<=') {
      return lte(definition.column, value as never);
    }
    if (operator === 'like' && !definition.isNumeric) {
      return like(definition.column, `%${filter.value}%`);
    }
    if (operator === 'between') {
      const [start, end] = filter.value.split(',');
      return between(definition.column, start, end);
    }
    if (operator === 'in') {
      const items = filter.value
        .split(',')
        .map((entry) => entry.trim().replace(/^'+|'+$/g, ''));
      return definition.isNumeric
        ? inArray(definition.column, items.map((entry) => Number(entry)))
        : inArray(definition.column, items as never);
    }

    return undefined;
  }
}

interface TaskRow {
  taskID: number;
  taskTitle: string;
  taskDescription: string;
  taskCompleted: boolean | number | string;
  taskCompletedAt: string | null;
  taskDateCreated: string | null;
  taskDateModified: string | null;
  taskTagID: number | null;
  taskTagName: string | null;
  taskTagType: string | null;
}
