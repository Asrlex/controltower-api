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
import { ShopService } from './shop.service';
import { CreateShopDto } from '@/api/home-management/entities/dtos/shop.dto';
import {
  SuccessCodes,
  ErrorCodes,
} from '@/api/entities/enums/response-codes.enum';
import { CompositeAuthGuard } from '@/api/auth/guards/composite-auth.guard';

@ApiTags('Shops')
@Controller()
@UseGuards(CompositeAuthGuard)
export class ShopController {
  constructor(
    private readonly logger: Logger,
    private readonly shopService: ShopService,
  ) {}

  @Get('status')
  status() {
    return this.shopService.status();
  }

  @Get('all')
  @ApiOperation({ summary: 'Get all products' })
  @ApiResponse({
    status: SuccessCodes.Ok,
    description: 'Shop(s) retrieved successfully',
  })
  @ApiResponse({ status: ErrorCodes.BadRequest, description: 'Bad Request' })
  @ApiResponse({ status: ErrorCodes.Unauthorized, description: 'Unauthorized' })
  @ApiResponse({ status: ErrorCodes.Forbidden, description: 'Forbidden' })
  @ApiResponse({ status: ErrorCodes.NotFound, description: 'Not Found' })
  async findAllShops() {
    const response = await this.shopService.findAllShops();
    const formattedResponse = formatResponse(response.entities, {
      total: response.total,
    });
    return formattedResponse;
  }

  @Get('id/:id')
  @ApiOperation({
    summary: 'Get a shop by ID',
  })
  @ApiParam({ name: 'id', description: 'Shop ID' })
  @ApiResponse({
    status: SuccessCodes.Ok,
    description: 'Shop(s) retrieved successfully',
  })
  @ApiResponse({ status: ErrorCodes.BadRequest, description: 'Bad Request' })
  @ApiResponse({ status: ErrorCodes.Unauthorized, description: 'Unauthorized' })
  @ApiResponse({ status: ErrorCodes.Forbidden, description: 'Forbidden' })
  @ApiResponse({ status: ErrorCodes.NotFound, description: 'Not Found' })
  async getShopById(@Param('id') id: string) {
    const response = await this.shopService.getShopById(id);
    const formattedResponse = formatResponse(response, { id });
    return formattedResponse;
  }

  @Get('')
  @ApiOperation({
    summary: 'Get products with pagination and optional search criteria',
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
    description: 'Shop(s) retrieved successfully',
  })
  @ApiResponse({ status: ErrorCodes.BadRequest, description: 'Bad Request' })
  @ApiResponse({ status: ErrorCodes.Unauthorized, description: 'Unauthorized' })
  @ApiResponse({ status: ErrorCodes.Forbidden, description: 'Forbidden' })
  @ApiResponse({ status: ErrorCodes.NotFound, description: 'Not Found' })
  async getShops(
    @Query('page', new ValidatePaginationPipe()) page: number = 0,
    @Query('limit', new ValidatePaginationPipe()) limit: number = 50,
    @Query('searchCriteria', new ValidateSearchCriteriaPipe())
    searchCriteria?: string,
  ) {
    const searchCriteriaObj: SearchCriteriaI = JSON.parse(
      decodeURIComponent(searchCriteria),
    );
    const response = await this.shopService.getShops(
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
    summary: 'Create a new product',
  })
  @ApiBody({ description: 'Shop data', type: CreateShopDto })
  @ApiResponse({
    status: SuccessCodes.Created,
    description: 'Shop created successfully',
  })
  @ApiResponse({ status: ErrorCodes.BadRequest, description: 'Bad Request' })
  @ApiResponse({ status: ErrorCodes.Unauthorized, description: 'Unauthorized' })
  @ApiResponse({ status: ErrorCodes.Forbidden, description: 'Forbidden' })
  @ApiResponse({ status: ErrorCodes.NotFound, description: 'Not Found' })
  async createShop(@Body() product: CreateShopDto) {
    const response = await this.shopService.createShop(product);
    const formattedResponse = formatResponse(response, {
      id: response.shopID,
    });
    return formattedResponse;
  }

  @Put(':id')
  @UsePipes(dtoValidator())
  @ApiOperation({
    summary: 'Update an existing product',
  })
  @ApiParam({ name: 'id', description: 'Shop ID' })
  @ApiBody({ description: 'Shop data', type: CreateShopDto })
  @ApiResponse({
    status: SuccessCodes.Ok,
    description: 'Shop updated successfully',
  })
  @ApiResponse({ status: ErrorCodes.BadRequest, description: 'Bad Request' })
  @ApiResponse({ status: ErrorCodes.Unauthorized, description: 'Unauthorized' })
  @ApiResponse({ status: ErrorCodes.Forbidden, description: 'Forbidden' })
  @ApiResponse({ status: ErrorCodes.NotFound, description: 'Not Found' })
  async updateShop(@Param('id') id: string, @Body() product: CreateShopDto) {
    const response = await this.shopService.updateShop(id, product);
    const formattedResponse = formatResponse(response, { id });
    return formattedResponse;
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete an existing product',
  })
  @ApiParam({ name: 'id', description: 'Shop ID' })
  @ApiResponse({
    status: SuccessCodes.NoContent,
    description: 'Shop deleted successfully',
  })
  @ApiResponse({ status: ErrorCodes.BadRequest, description: 'Bad Request' })
  @ApiResponse({ status: ErrorCodes.Unauthorized, description: 'Unauthorized' })
  @ApiResponse({ status: ErrorCodes.Forbidden, description: 'Forbidden' })
  @ApiResponse({ status: ErrorCodes.NotFound, description: 'Not Found' })
  async deleteShop(@Param('id') id: string) {
    await this.shopService.deleteShop(id);
    const formattedResponse = formatResponse(null, { id });
    return formattedResponse;
  }
}
