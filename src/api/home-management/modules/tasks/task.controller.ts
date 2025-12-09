import {
  Body,
  Controller,
  Delete,
  Get,
  Logger,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { dtoValidator, formatResponse } from '@/common/utils/utils.api';
import { ValidatePaginationPipe } from 'src/common/pipes/pagination.pipe';
import { SearchCriteriaI } from 'src/api/entities/interfaces/api.entity';
import { ValidateSearchCriteriaPipe } from 'src/common/pipes/search.pipe';
import {
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { TaskService } from './task.service';
import {
  CreateCarTaskDto,
  CreateHouseTaskDto,
  CreateTaskDto,
} from '@/api/home-management/entities/dtos/task.dto';
import {
  SuccessCodes,
  ErrorCodes,
} from '@/api/entities/enums/response-codes.enum';
import { CompositeAuthGuard } from '@/api/auth/guards/composite-auth.guard';

@ApiTags('Tasks')
@Controller()
@UseGuards(CompositeAuthGuard)
export class TaskController {
  constructor(
    private readonly logger: Logger,
    private readonly taskService: TaskService,
  ) {}

  @Get('status')
  status() {
    return this.taskService.status();
  }

  @Get('all')
  @ApiOperation({ summary: 'Get all tasks' })
  @ApiResponse({
    status: SuccessCodes.Ok,
    description: 'Task(s) retrieved successfully',
  })
  @ApiResponse({ status: ErrorCodes.BadRequest, description: 'Bad Request' })
  @ApiResponse({ status: ErrorCodes.Unauthorized, description: 'Unauthorized' })
  @ApiResponse({ status: ErrorCodes.Forbidden, description: 'Forbidden' })
  @ApiResponse({ status: ErrorCodes.NotFound, description: 'Not Found' })
  async findAllTasks() {
    const response = await this.taskService.findAllTasks();
    const formattedResponse = formatResponse(response.entities, {
      total: response.total,
    });
    return formattedResponse;
  }

  @Get('all/home')
  @ApiOperation({ summary: 'Get all house tasks' })
  @ApiResponse({
    status: SuccessCodes.Ok,
    description: 'House task(s) retrieved successfully',
  })
  @ApiResponse({ status: ErrorCodes.BadRequest, description: 'Bad Request' })
  @ApiResponse({ status: ErrorCodes.Unauthorized, description: 'Unauthorized' })
  @ApiResponse({ status: ErrorCodes.Forbidden, description: 'Forbidden' })
  @ApiResponse({ status: ErrorCodes.NotFound, description: 'Not Found' })
  async findAllHouseTasks() {
    const response = await this.taskService.findAllHouseTasks();
    const formattedResponse = formatResponse(response.entities, {
      total: response.total,
    });
    return formattedResponse;
  }

  @Get('all/car')
  @ApiOperation({ summary: 'Get all car tasks' })
  @ApiResponse({
    status: SuccessCodes.Ok,
    description: 'Car task(s) retrieved successfully',
  })
  @ApiResponse({ status: ErrorCodes.BadRequest, description: 'Bad Request' })
  @ApiResponse({ status: ErrorCodes.Unauthorized, description: 'Unauthorized' })
  @ApiResponse({ status: ErrorCodes.Forbidden, description: 'Forbidden' })
  @ApiResponse({ status: ErrorCodes.NotFound, description: 'Not Found' })
  async findAllCarTasks() {
    const response = await this.taskService.findAllCarTasks();
    const formattedResponse = formatResponse(response.entities, {
      total: response.total,
    });
    return formattedResponse;
  }

  @Get('id/:id')
  @ApiOperation({
    summary: 'Get a tasks by ID',
  })
  @ApiParam({ name: 'id', description: 'Task ID' })
  @ApiResponse({
    status: SuccessCodes.Ok,
    description: 'Task(s) retrieved successfully',
  })
  @ApiResponse({ status: ErrorCodes.BadRequest, description: 'Bad Request' })
  @ApiResponse({ status: ErrorCodes.Unauthorized, description: 'Unauthorized' })
  @ApiResponse({ status: ErrorCodes.Forbidden, description: 'Forbidden' })
  @ApiResponse({ status: ErrorCodes.NotFound, description: 'Not Found' })
  async getTaskById(@Param('id') id: string) {
    const response = await this.taskService.findById(id);
    const formattedResponse = formatResponse(response, { id });
    return formattedResponse;
  }

  @Get('')
  @ApiOperation({
    summary: 'Get tasks with pagination and optional search criteria',
  })
  @ApiQuery({ name: 'page', description: 'Requested page', type: 'number' })
  @ApiQuery({ name: 'limit', description: 'Elements per page', type: 'number' })
  @ApiQuery({
    name: 'searchCriteria',
    description: 'Search criteria',
    required: false,
  })
  @ApiResponse({
    status: SuccessCodes.Ok,
    description: 'Task(s) retrieved successfully',
  })
  @ApiResponse({ status: ErrorCodes.BadRequest, description: 'Bad Request' })
  @ApiResponse({ status: ErrorCodes.Unauthorized, description: 'Unauthorized' })
  @ApiResponse({ status: ErrorCodes.Forbidden, description: 'Forbidden' })
  @ApiResponse({ status: ErrorCodes.NotFound, description: 'Not Found' })
  async getTasks(
    @Query('page', new ValidatePaginationPipe()) page: number = 0,
    @Query('limit', new ValidatePaginationPipe()) limit: number = 50,
    @Query('searchCriteria', new ValidateSearchCriteriaPipe())
    searchCriteria?: string,
  ) {
    const searchCriteriaObj: SearchCriteriaI = JSON.parse(
      decodeURIComponent(searchCriteria),
    );
    const response = await this.taskService.findTasks(
      page,
      limit,
      searchCriteriaObj,
    );
    const formattedResponse = formatResponse(response.entities, {
      total: response.total,
      page,
      limit,
      searchCriteria: searchCriteriaObj,
    });
    return formattedResponse;
  }

  @Get('home')
  @ApiOperation({
    summary: 'Get tasks with pagination and optional search criteria',
  })
  @ApiQuery({ name: 'page', description: 'Requested page', type: 'number' })
  @ApiQuery({ name: 'limit', description: 'Elements per page', type: 'number' })
  @ApiResponse({
    status: SuccessCodes.Ok,
    description: 'Task(s) retrieved successfully',
  })
  @ApiResponse({ status: ErrorCodes.BadRequest, description: 'Bad Request' })
  @ApiResponse({ status: ErrorCodes.Unauthorized, description: 'Unauthorized' })
  @ApiResponse({ status: ErrorCodes.Forbidden, description: 'Forbidden' })
  @ApiResponse({ status: ErrorCodes.NotFound, description: 'Not Found' })
  async findHouseTasks(
    @Query('page', new ValidatePaginationPipe()) page: number = 0,
    @Query('limit', new ValidatePaginationPipe()) limit: number = 50,
  ) {
    const response = await this.taskService.findHouseTasks(page, limit);
    const formattedResponse = formatResponse(response.entities, {
      total: response.total,
      page,
      limit,
    });
    return formattedResponse;
  }

  @Get('car')
  @ApiOperation({
    summary: 'Get tasks with pagination and optional search criteria',
  })
  @ApiQuery({ name: 'page', description: 'Requested page', type: 'number' })
  @ApiQuery({ name: 'limit', description: 'Elements per page', type: 'number' })
  @ApiResponse({
    status: SuccessCodes.Ok,
    description: 'Task(s) retrieved successfully',
  })
  @ApiResponse({ status: ErrorCodes.BadRequest, description: 'Bad Request' })
  @ApiResponse({ status: ErrorCodes.Unauthorized, description: 'Unauthorized' })
  @ApiResponse({ status: ErrorCodes.Forbidden, description: 'Forbidden' })
  @ApiResponse({ status: ErrorCodes.NotFound, description: 'Not Found' })
  async findCarTasks(
    @Query('page', new ValidatePaginationPipe()) page: number = 0,
    @Query('limit', new ValidatePaginationPipe()) limit: number = 50,
  ) {
    const response = await this.taskService.findCarTasks(page, limit);
    const formattedResponse = formatResponse(response.entities, {
      total: response.total,
      page,
      limit,
    });
    return formattedResponse;
  }

  @Post('home')
  @UsePipes(dtoValidator())
  @ApiOperation({
    summary: 'Create a new house task',
  })
  @ApiBody({ description: 'Task data', type: CreateTaskDto })
  @ApiResponse({
    status: SuccessCodes.Created,
    description: 'Task created successfully',
  })
  @ApiResponse({ status: ErrorCodes.BadRequest, description: 'Bad Request' })
  @ApiResponse({ status: ErrorCodes.Unauthorized, description: 'Unauthorized' })
  @ApiResponse({ status: ErrorCodes.Forbidden, description: 'Forbidden' })
  @ApiResponse({ status: ErrorCodes.NotFound, description: 'Not Found' })
  async createHouseTask(@Body() task: CreateHouseTaskDto) {
    const response = await this.taskService.createHouseTask(task);
    const formattedResponse = formatResponse(response, {
      id: response.houseTaskID,
    });
    return formattedResponse;
  }

  @Post('car')
  @UsePipes(dtoValidator())
  @ApiOperation({
    summary: 'Create a new car task',
  })
  @ApiBody({ description: 'Task data', type: CreateTaskDto })
  @ApiResponse({
    status: SuccessCodes.Created,
    description: 'Task created successfully',
  })
  @ApiResponse({ status: ErrorCodes.BadRequest, description: 'Bad Request' })
  @ApiResponse({ status: ErrorCodes.Unauthorized, description: 'Unauthorized' })
  @ApiResponse({ status: ErrorCodes.Forbidden, description: 'Forbidden' })
  @ApiResponse({ status: ErrorCodes.NotFound, description: 'Not Found' })
  async createCarTask(@Body() task: CreateCarTaskDto) {
    const response = await this.taskService.createCarTask(task);
    const formattedResponse = formatResponse(response, {
      id: response.carTaskID,
    });
    return formattedResponse;
  }

  @Post('')
  @UsePipes(dtoValidator())
  @ApiOperation({
    summary: 'Create a new task',
  })
  @ApiBody({ description: 'Task data', type: CreateTaskDto })
  @ApiResponse({
    status: SuccessCodes.Created,
    description: 'Task created successfully',
  })
  @ApiResponse({ status: ErrorCodes.BadRequest, description: 'Bad Request' })
  @ApiResponse({ status: ErrorCodes.Unauthorized, description: 'Unauthorized' })
  @ApiResponse({ status: ErrorCodes.Forbidden, description: 'Forbidden' })
  @ApiResponse({ status: ErrorCodes.NotFound, description: 'Not Found' })
  async createTask(@Body() task: CreateTaskDto) {
    const response = await this.taskService.createTask(task);
    const formattedResponse = formatResponse(response, {
      id: response.taskID,
    });
    return formattedResponse;
  }

  @Put(':id')
  @UsePipes(dtoValidator())
  @ApiOperation({
    summary: 'Update an existing task',
  })
  @ApiParam({ name: 'id', description: 'Task ID' })
  @ApiBody({ description: 'Task data', type: CreateTaskDto })
  @ApiResponse({
    status: SuccessCodes.Ok,
    description: 'Task updated successfully',
  })
  @ApiResponse({ status: ErrorCodes.BadRequest, description: 'Bad Request' })
  @ApiResponse({ status: ErrorCodes.Unauthorized, description: 'Unauthorized' })
  @ApiResponse({ status: ErrorCodes.Forbidden, description: 'Forbidden' })
  @ApiResponse({ status: ErrorCodes.NotFound, description: 'Not Found' })
  async updateTask(@Param('id') id: string, @Body() task: CreateTaskDto) {
    const response = await this.taskService.updateTask(id, task);
    const formattedResponse = formatResponse(response, { id });
    return formattedResponse;
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update an existing task',
  })
  @ApiParam({ name: 'id', description: 'Task ID' })
  @ApiQuery({
    name: 'completed',
    description: 'Task completed status',
    type: 'boolean',
  })
  @ApiResponse({
    status: SuccessCodes.Ok,
    description: 'Task updated successfully',
  })
  @ApiResponse({ status: ErrorCodes.BadRequest, description: 'Bad Request' })
  @ApiResponse({ status: ErrorCodes.Unauthorized, description: 'Unauthorized' })
  @ApiResponse({ status: ErrorCodes.Forbidden, description: 'Forbidden' })
  @ApiResponse({ status: ErrorCodes.NotFound, description: 'Not Found' })
  async toggleCompletedTask(
    @Param('id') id: string,
    @Query('taskCompleted') taskCompleted: boolean,
  ) {
    const response = await this.taskService.toggleCompletedTask(
      id,
      taskCompleted,
    );
    const formattedResponse = formatResponse(response, { id });
    return formattedResponse;
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete an existing task',
  })
  @ApiParam({ name: 'id', description: 'Task ID' })
  @ApiResponse({
    status: SuccessCodes.NoContent,
    description: 'Task deleted successfully',
  })
  @ApiResponse({ status: ErrorCodes.BadRequest, description: 'Bad Request' })
  @ApiResponse({ status: ErrorCodes.Unauthorized, description: 'Unauthorized' })
  @ApiResponse({ status: ErrorCodes.Forbidden, description: 'Forbidden' })
  @ApiResponse({ status: ErrorCodes.NotFound, description: 'Not Found' })
  async deleteTask(@Param('id') id: string) {
    await this.taskService.deleteTask(id);
    const formattedResponse = formatResponse(null, { id });
    return formattedResponse;
  }

  @Delete('home/:id')
  @ApiOperation({
    summary: 'Delete an existing house task',
  })
  @ApiParam({ name: 'id', description: 'House task ID' })
  @ApiResponse({
    status: SuccessCodes.NoContent,
    description: 'Task deleted successfully',
  })
  @ApiResponse({ status: ErrorCodes.BadRequest, description: 'Bad Request' })
  @ApiResponse({ status: ErrorCodes.Unauthorized, description: 'Unauthorized' })
  @ApiResponse({ status: ErrorCodes.Forbidden, description: 'Forbidden' })
  @ApiResponse({ status: ErrorCodes.NotFound, description: 'Not Found' })
  async deleteHouseTask(@Param('id') id: string) {
    await this.taskService.deleteHouseTask(id);
    const formattedResponse = formatResponse(null, { id });
    return formattedResponse;
  }

  @Delete('car/:id')
  @ApiOperation({
    summary: 'Delete an existing car task',
  })
  @ApiParam({ name: 'id', description: 'Car task ID' })
  @ApiResponse({
    status: SuccessCodes.NoContent,
    description: 'Task deleted successfully',
  })
  @ApiResponse({ status: ErrorCodes.BadRequest, description: 'Bad Request' })
  @ApiResponse({ status: ErrorCodes.Unauthorized, description: 'Unauthorized' })
  @ApiResponse({ status: ErrorCodes.Forbidden, description: 'Forbidden' })
  @ApiResponse({ status: ErrorCodes.NotFound, description: 'Not Found' })
  async deleteCarTask(@Param('id') id: string) {
    await this.taskService.deleteCarTask(id);
    const formattedResponse = formatResponse(null, { id });
    return formattedResponse;
  }
}
