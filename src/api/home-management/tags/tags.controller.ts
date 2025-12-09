import {
  Body,
  Controller,
  Delete,
  Get,
  Logger,
  Param,
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
import { TagService } from './tags.service';
import {
  CreateItemTagDto,
  CreateTagDto,
} from '@/api/home-management/entities/dtos/tag.dto';
import {
  SuccessCodes,
  ErrorCodes,
} from '@/api/entities/enums/response-codes.enum';
import { CompositeAuthGuard } from '@/api/auth/guards/composite-auth.guard';

@ApiTags('Tags')
@Controller()
@UseGuards(CompositeAuthGuard)
export class TagController {
  constructor(
    private readonly logger: Logger,
    private readonly tagService: TagService,
  ) {}

  @Get('status')
  status() {
    return this.tagService.status();
  }

  @Get('all')
  @ApiOperation({ summary: 'Get all tags' })
  @ApiResponse({
    status: SuccessCodes.Ok,
    description: 'Tag(s) retrieved successfully',
  })
  @ApiResponse({ status: ErrorCodes.BadRequest, description: 'Bad Request' })
  @ApiResponse({ status: ErrorCodes.Unauthorized, description: 'Unauthorized' })
  @ApiResponse({ status: ErrorCodes.Forbidden, description: 'Forbidden' })
  @ApiResponse({ status: ErrorCodes.NotFound, description: 'Not Found' })
  async findAllTags() {
    const response = await this.tagService.findAllTags();
    const formattedResponse = formatResponse(response.entities, {
      total: response.total,
    });
    return formattedResponse;
  }

  @Get('id/:id')
  @ApiOperation({
    summary: 'Get a tags by ID',
  })
  @ApiParam({ name: 'id', description: 'Tag ID' })
  @ApiResponse({
    status: SuccessCodes.Ok,
    description: 'Tag(s) retrieved successfully',
  })
  @ApiResponse({ status: ErrorCodes.BadRequest, description: 'Bad Request' })
  @ApiResponse({ status: ErrorCodes.Unauthorized, description: 'Unauthorized' })
  @ApiResponse({ status: ErrorCodes.Forbidden, description: 'Forbidden' })
  @ApiResponse({ status: ErrorCodes.NotFound, description: 'Not Found' })
  async getTagById(@Param('id') id: string) {
    const response = await this.tagService.getTagById(id);
    const formattedResponse = formatResponse(response, { id });
    return formattedResponse;
  }

  @Get('')
  @ApiOperation({
    summary: 'Get tags with pagination and optional search criteria',
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
    description: 'Tag(s) retrieved successfully',
  })
  @ApiResponse({ status: ErrorCodes.BadRequest, description: 'Bad Request' })
  @ApiResponse({ status: ErrorCodes.Unauthorized, description: 'Unauthorized' })
  @ApiResponse({ status: ErrorCodes.Forbidden, description: 'Forbidden' })
  @ApiResponse({ status: ErrorCodes.NotFound, description: 'Not Found' })
  async getTags(
    @Query('page', new ValidatePaginationPipe()) page: number = 0,
    @Query('limit', new ValidatePaginationPipe()) limit: number = 50,
    @Query('searchCriteria', new ValidateSearchCriteriaPipe())
    searchCriteria?: string,
  ) {
    const searchCriteriaObj: SearchCriteriaI = JSON.parse(
      decodeURIComponent(searchCriteria),
    );
    const response = await this.tagService.getTags(
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

  @Post('')
  @UsePipes(dtoValidator())
  @ApiOperation({
    summary: 'Create a new tag',
  })
  @ApiBody({ description: 'Tag data', type: CreateTagDto })
  @ApiResponse({
    status: SuccessCodes.Created,
    description: 'Tag created successfully',
  })
  @ApiResponse({ status: ErrorCodes.BadRequest, description: 'Bad Request' })
  @ApiResponse({ status: ErrorCodes.Unauthorized, description: 'Unauthorized' })
  @ApiResponse({ status: ErrorCodes.Forbidden, description: 'Forbidden' })
  @ApiResponse({ status: ErrorCodes.NotFound, description: 'Not Found' })
  async createTag(@Body() tag: CreateTagDto) {
    const response = await this.tagService.createTag(tag);
    const formattedResponse = formatResponse(response, {
      id: response.tagID,
    });
    return formattedResponse;
  }

  @Post('item')
  @UsePipes(dtoValidator())
  @ApiOperation({
    summary: 'Create a new tag association with an item',
  })
  @ApiBody({ description: 'Tag data', type: CreateItemTagDto })
  @ApiResponse({
    status: SuccessCodes.Created,
    description: 'Association created successfully',
  })
  @ApiResponse({ status: ErrorCodes.BadRequest, description: 'Bad Request' })
  @ApiResponse({ status: ErrorCodes.Unauthorized, description: 'Unauthorized' })
  @ApiResponse({ status: ErrorCodes.Forbidden, description: 'Forbidden' })
  @ApiResponse({ status: ErrorCodes.NotFound, description: 'Not Found' })
  async createItemTag(@Body() tag: CreateItemTagDto) {
    await this.tagService.createItemTag(
      tag.tagID.toString(),
      tag.itemID.toString(),
    );
    const formattedResponse = formatResponse(null);
    return formattedResponse;
  }

  @Put(':id')
  @UsePipes(dtoValidator())
  @ApiOperation({
    summary: 'Update an existing tag',
  })
  @ApiParam({ name: 'id', description: 'Tag ID' })
  @ApiBody({ description: 'Tag data', type: CreateTagDto })
  @ApiResponse({
    status: SuccessCodes.Ok,
    description: 'Tag updated successfully',
  })
  @ApiResponse({ status: ErrorCodes.BadRequest, description: 'Bad Request' })
  @ApiResponse({ status: ErrorCodes.Unauthorized, description: 'Unauthorized' })
  @ApiResponse({ status: ErrorCodes.Forbidden, description: 'Forbidden' })
  @ApiResponse({ status: ErrorCodes.NotFound, description: 'Not Found' })
  async updateTag(@Param('id') id: string, @Body() tag: CreateTagDto) {
    const response = await this.tagService.updateTag(id, tag);
    const formattedResponse = formatResponse(response, { id });
    return formattedResponse;
  }

  @Delete('item')
  @UsePipes(dtoValidator())
  @ApiOperation({
    summary: 'Delete an existing tag association with an item',
  })
  @ApiBody({ description: 'Tag data', type: CreateItemTagDto })
  @ApiResponse({
    status: SuccessCodes.NoContent,
    description: 'Association deleted successfully',
  })
  @ApiResponse({ status: ErrorCodes.BadRequest, description: 'Bad Request' })
  @ApiResponse({ status: ErrorCodes.Unauthorized, description: 'Unauthorized' })
  @ApiResponse({ status: ErrorCodes.Forbidden, description: 'Forbidden' })
  @ApiResponse({ status: ErrorCodes.NotFound, description: 'Not Found' })
  async deleteItemTag(@Body() tag: CreateItemTagDto) {
    await this.tagService.deleteItemTag(
      tag.tagID.toString(),
      tag.itemID.toString(),
    );
    const formattedResponse = formatResponse(null);
    return formattedResponse;
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete an existing tag',
  })
  @ApiParam({ name: 'id', description: 'Tag ID' })
  @ApiResponse({
    status: SuccessCodes.NoContent,
    description: 'Tag deleted successfully',
  })
  @ApiResponse({ status: ErrorCodes.BadRequest, description: 'Bad Request' })
  @ApiResponse({ status: ErrorCodes.Unauthorized, description: 'Unauthorized' })
  @ApiResponse({ status: ErrorCodes.Forbidden, description: 'Forbidden' })
  @ApiResponse({ status: ErrorCodes.NotFound, description: 'Not Found' })
  async deleteTag(@Param('id') id: string) {
    await this.tagService.deleteTag(id);
    const formattedResponse = formatResponse(null, { id });
    return formattedResponse;
  }
}
