import {
  Body,
  Controller,
  Delete,
  Get,
  Logger,
  Param,
  Post,
  Put,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { SettingService } from './settings.service';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { dtoValidator, formatResponse } from '@/common/utils/utils.api';
import { CreateSettingsDto } from '@/api/home-management/entities/dtos/settings.dto';
import {
  SuccessCodes,
  ErrorCodes,
} from '@/api/entities/enums/response-codes.enum';
import { CompositeAuthGuard } from '@/api/auth/guards/composite-auth.guard';

@ApiTags('Settingss')
@Controller()
@UseGuards(CompositeAuthGuard)
export class SettingsController {
  constructor(
    private readonly logger: Logger,
    private readonly settingsService: SettingService,
  ) {}

  @Get('status')
  status() {
    return this.settingsService.status();
  }

  @Get('all')
  @ApiOperation({ summary: 'Get all settings' })
  @ApiResponse({
    status: SuccessCodes.Ok,
    description: 'Settings retrieved successfully',
  })
  @ApiResponse({ status: ErrorCodes.BadRequest, description: 'Bad Request' })
  @ApiResponse({ status: ErrorCodes.Unauthorized, description: 'Unauthorized' })
  @ApiResponse({ status: ErrorCodes.Forbidden, description: 'Forbidden' })
  @ApiResponse({ status: ErrorCodes.NotFound, description: 'Not Found' })
  async findAllSettingss() {
    const response = await this.settingsService.findAllSettings();
    const formattedResponse = formatResponse(response.entities, {
      total: response.total,
    });
    return formattedResponse;
  }

  @Get('id/:id')
  @ApiOperation({
    summary: 'Get user settings by ID',
  })
  @ApiParam({ name: 'id', description: 'Setting ID' })
  @ApiResponse({
    status: SuccessCodes.Ok,
    description: 'Setting(s) retrieved successfully',
  })
  @ApiResponse({ status: ErrorCodes.BadRequest, description: 'Bad Request' })
  @ApiResponse({ status: ErrorCodes.Unauthorized, description: 'Unauthorized' })
  @ApiResponse({ status: ErrorCodes.Forbidden, description: 'Forbidden' })
  @ApiResponse({ status: ErrorCodes.NotFound, description: 'Not Found' })
  async getSettingsById(@Param('id') id: string) {
    const response = await this.settingsService.getSettingById(id);
    const formattedResponse = formatResponse(response, { id });
    return formattedResponse;
  }

  @Post('')
  @UsePipes(dtoValidator())
  @ApiOperation({
    summary: 'Create new user settings',
  })
  @ApiResponse({
    status: SuccessCodes.Created,
    description: 'Settings created successfully',
  })
  @ApiResponse({ status: ErrorCodes.BadRequest, description: 'Bad Request' })
  @ApiResponse({ status: ErrorCodes.Unauthorized, description: 'Unauthorized' })
  @ApiResponse({ status: ErrorCodes.Forbidden, description: 'Forbidden' })
  @ApiResponse({ status: ErrorCodes.NotFound, description: 'Not Found' })
  async createSettings(@Body() dto: CreateSettingsDto) {
    const response = await this.settingsService.createSettings(dto);
    const formattedResponse = formatResponse(response, {
      id: response.settingsID,
    });
    return formattedResponse;
  }

  @Put(':id')
  @UsePipes(dtoValidator())
  @ApiOperation({
    summary: 'Update user settings by ID',
  })
  @ApiParam({ name: 'id', description: 'Setting ID' })
  @ApiResponse({
    status: SuccessCodes.Ok,
    description: 'Setting(s) updated successfully',
  })
  @ApiResponse({ status: ErrorCodes.BadRequest, description: 'Bad Request' })
  @ApiResponse({ status: ErrorCodes.Unauthorized, description: 'Unauthorized' })
  @ApiResponse({ status: ErrorCodes.Forbidden, description: 'Forbidden' })
  @ApiResponse({ status: ErrorCodes.NotFound, description: 'Not Found' })
  async updateSettings(
    @Param('id') id: string,
    @Body() dto: CreateSettingsDto,
  ) {
    const response = await this.settingsService.updateSettings(id, dto);
    const formattedResponse = formatResponse(response, { id });
    return formattedResponse;
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete user settings by ID',
  })
  @ApiParam({ name: 'id', description: 'Setting ID' })
  @ApiResponse({
    status: SuccessCodes.NoContent,
    description: 'Setting(s) deleted successfully',
  })
  @ApiResponse({ status: ErrorCodes.BadRequest, description: 'Bad Request' })
  @ApiResponse({ status: ErrorCodes.Unauthorized, description: 'Unauthorized' })
  @ApiResponse({ status: ErrorCodes.Forbidden, description: 'Forbidden' })
  @ApiResponse({ status: ErrorCodes.NotFound, description: 'Not Found' })
  async deleteSettings(@Param('id') id: string) {
    const response = await this.settingsService.deleteSettings(id);
    const formattedResponse = formatResponse(response, { id });
    return formattedResponse;
  }
}
