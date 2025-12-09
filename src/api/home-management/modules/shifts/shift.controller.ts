import {
  Body,
  Controller,
  Delete,
  Get,
  Logger,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { dtoValidator, formatResponse } from '@/common/utils/utils.api';
import {
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  CreateAbsenceDto,
  CreateShiftCheckinDto,
} from '@/api/home-management/entities/dtos/shift.dto';
import {
  SuccessCodes,
  ErrorCodes,
} from '@/api/entities/enums/response-codes.enum';
import { ShiftService } from './shift.service';
import { CompositeAuthGuard } from '@/api/auth/guards/composite-auth.guard';
import { Request } from 'express';
import { AuthService } from '@/api/auth/auth.service';

@ApiTags('Shifts')
@Controller()
@UseGuards(CompositeAuthGuard)
export class ShiftController {
  constructor(
    private readonly logger: Logger,
    private readonly shiftService: ShiftService,
    private readonly authService: AuthService,
  ) {}

  @Get('status')
  status() {
    return this.shiftService.status();
  }

  @Get('all')
  @ApiOperation({ summary: 'Get all shifts' })
  @ApiResponse({
    status: SuccessCodes.Ok,
    description: 'Shift(s) retrieved successfully',
  })
  @ApiResponse({ status: ErrorCodes.BadRequest, description: 'Bad Request' })
  @ApiResponse({ status: ErrorCodes.Unauthorized, description: 'Unauthorized' })
  @ApiResponse({ status: ErrorCodes.Forbidden, description: 'Forbidden' })
  @ApiResponse({ status: ErrorCodes.NotFound, description: 'Not Found' })
  async findAllShifts() {
    const response = await this.shiftService.findAllShifts();
    const formattedResponse = formatResponse(response.entities, {
      total: response.total,
    });
    return formattedResponse;
  }

  @Get('absence')
  @ApiOperation({ summary: 'Get all absences' })
  @ApiResponse({
    status: SuccessCodes.Ok,
    description: 'Absence(s) retrieved successfully',
  })
  @ApiResponse({ status: ErrorCodes.BadRequest, description: 'Bad Request' })
  @ApiResponse({ status: ErrorCodes.Unauthorized, description: 'Unauthorized' })
  @ApiResponse({ status: ErrorCodes.Forbidden, description: 'Forbidden' })
  @ApiResponse({ status: ErrorCodes.NotFound, description: 'Not Found' })
  async findAllAbsences(@Req() req: Request) {
    const token = await this.authService.getTokenFromRequest(req);
    const user = await this.authService.getUserFromToken(token);
    const response = await this.shiftService.findAllAbsences(user);
    const formattedResponse = formatResponse(response);
    return formattedResponse;
  }

  @Get('id/:id')
  @ApiOperation({
    summary: 'Get a shift by ID',
  })
  @ApiParam({ name: 'id', description: 'Shift ID' })
  @ApiResponse({
    status: SuccessCodes.Ok,
    description: 'Shift(s) retrieved successfully',
  })
  @ApiResponse({ status: ErrorCodes.BadRequest, description: 'Bad Request' })
  @ApiResponse({ status: ErrorCodes.Unauthorized, description: 'Unauthorized' })
  @ApiResponse({ status: ErrorCodes.Forbidden, description: 'Forbidden' })
  @ApiResponse({ status: ErrorCodes.NotFound, description: 'Not Found' })
  async getShiftById(@Param('id') id: string) {
    const response = await this.shiftService.getShiftById(id);
    const formattedResponse = formatResponse(response, { id });
    return formattedResponse;
  }

  @Get('month/:month')
  @ApiOperation({
    summary: 'Get shifts by month',
  })
  @ApiParam({ name: 'month', description: 'Shift month' })
  @ApiResponse({
    status: SuccessCodes.Ok,
    description: 'Shift(s) retrieved successfully',
  })
  @ApiResponse({ status: ErrorCodes.BadRequest, description: 'Bad Request' })
  @ApiResponse({ status: ErrorCodes.Unauthorized, description: 'Unauthorized' })
  @ApiResponse({ status: ErrorCodes.Forbidden, description: 'Forbidden' })
  @ApiResponse({ status: ErrorCodes.NotFound, description: 'Not Found' })
  async getShiftsByMonth(@Param('month') month: string, @Req() req: Request) {
    const token = await this.authService.getTokenFromRequest(req);
    const user = await this.authService.getUserFromToken(token);
    const response = await this.shiftService.getShiftsByMonth(month, user);
    const formattedResponse = formatResponse(response, { id: month });
    return formattedResponse;
  }

  @Post('')
  @UsePipes(dtoValidator())
  @ApiOperation({
    summary: 'Create a new shift',
  })
  @ApiBody({ description: 'Shift data', type: CreateShiftCheckinDto })
  @ApiResponse({
    status: SuccessCodes.Created,
    description: 'Shift created successfully',
  })
  @ApiResponse({ status: ErrorCodes.BadRequest, description: 'Bad Request' })
  @ApiResponse({ status: ErrorCodes.Unauthorized, description: 'Unauthorized' })
  @ApiResponse({ status: ErrorCodes.Forbidden, description: 'Forbidden' })
  @ApiResponse({ status: ErrorCodes.NotFound, description: 'Not Found' })
  async createShift(
    @Body() product: CreateShiftCheckinDto,
    @Req() req: Request,
  ) {
    const token = await this.authService.getTokenFromRequest(req);
    const user = await this.authService.getUserFromToken(token);
    const response = await this.shiftService.createShift(product, user);
    const formattedResponse = formatResponse(response, {
      id: response.shiftID,
    });
    return formattedResponse;
  }

  @Post('absence')
  @UsePipes(dtoValidator())
  @ApiOperation({
    summary: 'Create a new absence',
  })
  @ApiBody({ description: 'Absence data', type: CreateAbsenceDto })
  @ApiResponse({
    status: SuccessCodes.Created,
    description: 'Absence created successfully',
  })
  @ApiResponse({ status: ErrorCodes.BadRequest, description: 'Bad Request' })
  @ApiResponse({ status: ErrorCodes.Unauthorized, description: 'Unauthorized' })
  @ApiResponse({ status: ErrorCodes.Forbidden, description: 'Forbidden' })
  @ApiResponse({ status: ErrorCodes.NotFound, description: 'Not Found' })
  async createAbsence(@Body() absence: CreateAbsenceDto, @Req() req: Request) {
    const token = await this.authService.getTokenFromRequest(req);
    const user = await this.authService.getUserFromToken(token);
    await this.shiftService.createAbsence(absence, user);
    const formattedResponse = formatResponse(null);
    return formattedResponse;
  }

  @Put(':id')
  @UsePipes(dtoValidator())
  @ApiOperation({
    summary: 'Update an existing shift',
  })
  @ApiParam({ name: 'id', description: 'Shift ID' })
  @ApiBody({ description: 'Shift data', type: CreateShiftCheckinDto })
  @ApiResponse({
    status: SuccessCodes.Ok,
    description: 'Shift updated successfully',
  })
  @ApiResponse({ status: ErrorCodes.BadRequest, description: 'Bad Request' })
  @ApiResponse({ status: ErrorCodes.Unauthorized, description: 'Unauthorized' })
  @ApiResponse({ status: ErrorCodes.Forbidden, description: 'Forbidden' })
  @ApiResponse({ status: ErrorCodes.NotFound, description: 'Not Found' })
  async updateShift(
    @Param('id') id: string,
    @Body() product: CreateShiftCheckinDto,
  ) {
    const response = await this.shiftService.updateShift(id, product);
    const formattedResponse = formatResponse(response, { id });
    return formattedResponse;
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete an existing product',
  })
  @ApiParam({ name: 'id', description: 'Shift ID' })
  @ApiResponse({
    status: SuccessCodes.NoContent,
    description: 'Shift deleted successfully',
  })
  @ApiResponse({ status: ErrorCodes.BadRequest, description: 'Bad Request' })
  @ApiResponse({ status: ErrorCodes.Unauthorized, description: 'Unauthorized' })
  @ApiResponse({ status: ErrorCodes.Forbidden, description: 'Forbidden' })
  @ApiResponse({ status: ErrorCodes.NotFound, description: 'Not Found' })
  async deleteShift(@Param('id') id: string) {
    await this.shiftService.deleteShift(id);
    const formattedResponse = formatResponse(null, { id });
    return formattedResponse;
  }

  @Delete('absence/:id')
  @ApiOperation({
    summary: 'Delete an existing absence',
  })
  @ApiParam({ name: 'id', description: 'Absence ID' })
  @ApiResponse({
    status: SuccessCodes.NoContent,
    description: 'Absence deleted successfully',
  })
  @ApiResponse({ status: ErrorCodes.BadRequest, description: 'Bad Request' })
  @ApiResponse({ status: ErrorCodes.Unauthorized, description: 'Unauthorized' })
  @ApiResponse({ status: ErrorCodes.Forbidden, description: 'Forbidden' })
  @ApiResponse({ status: ErrorCodes.NotFound, description: 'Not Found' })
  async deleteAbsence(@Param('id') id: string) {
    await this.shiftService.deleteAbsence(id);
    const formattedResponse = formatResponse(null, { id });
    return formattedResponse;
  }
}
