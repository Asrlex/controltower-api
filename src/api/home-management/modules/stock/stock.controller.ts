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
import { StockProductService } from './stock.service';
import { CreateStockProductDto } from '@/api/home-management/entities/dtos/stock-product.dto';
import {
  SuccessCodes,
  ErrorCodes,
} from '@/api/entities/enums/response-codes.enum';
import { CompositeAuthGuard } from '@/api/auth/guards/composite-auth.guard';

@ApiTags('Stock Products')
@Controller()
@UseGuards(CompositeAuthGuard)
export class StockProductController {
  constructor(
    private readonly logger: Logger,
    private readonly stockProductService: StockProductService,
  ) {}

  @Get('status')
  status() {
    return this.stockProductService.status();
  }

  @Get('all')
  @ApiOperation({ summary: 'Get all products' })
  @ApiResponse({
    status: SuccessCodes.Ok,
    description: 'Product(s) retrieved successfully',
  })
  @ApiResponse({ status: ErrorCodes.BadRequest, description: 'Bad Request' })
  @ApiResponse({ status: ErrorCodes.Unauthorized, description: 'Unauthorized' })
  @ApiResponse({ status: ErrorCodes.Forbidden, description: 'Forbidden' })
  @ApiResponse({ status: ErrorCodes.NotFound, description: 'Not Found' })
  async findAllProducts() {
    const response = await this.stockProductService.findAllProducts();
    const formattedResponse = formatResponse(response.entities, {
      total: response.total,
    });
    return formattedResponse;
  }

  @Get('id/:id')
  @ApiOperation({
    summary: 'Get a products by ID',
  })
  @ApiParam({ name: 'id', description: 'Product ID' })
  @ApiResponse({
    status: SuccessCodes.Ok,
    description: 'Product(s) retrieved successfully',
  })
  @ApiResponse({ status: ErrorCodes.BadRequest, description: 'Bad Request' })
  @ApiResponse({ status: ErrorCodes.Unauthorized, description: 'Unauthorized' })
  @ApiResponse({ status: ErrorCodes.Forbidden, description: 'Forbidden' })
  @ApiResponse({ status: ErrorCodes.NotFound, description: 'Not Found' })
  async getProductById(@Param('id') id: string) {
    const response = await this.stockProductService.getProductById(id);
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
    description: 'Product(s) retrieved successfully',
  })
  @ApiResponse({ status: ErrorCodes.BadRequest, description: 'Bad Request' })
  @ApiResponse({ status: ErrorCodes.Unauthorized, description: 'Unauthorized' })
  @ApiResponse({ status: ErrorCodes.Forbidden, description: 'Forbidden' })
  @ApiResponse({ status: ErrorCodes.NotFound, description: 'Not Found' })
  async getProducts(
    @Query('page', new ValidatePaginationPipe()) page: number = 0,
    @Query('limit', new ValidatePaginationPipe()) limit: number = 50,
    @Query('searchCriteria', new ValidateSearchCriteriaPipe())
    searchCriteria?: string,
  ) {
    const searchCriteriaObj: SearchCriteriaI = JSON.parse(
      decodeURIComponent(searchCriteria),
    );
    const response = await this.stockProductService.getProducts(
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
  @ApiBody({ description: 'Product data', type: CreateStockProductDto })
  @ApiResponse({
    status: SuccessCodes.Created,
    description: 'Product created successfully',
  })
  @ApiResponse({ status: ErrorCodes.BadRequest, description: 'Bad Request' })
  @ApiResponse({ status: ErrorCodes.Unauthorized, description: 'Unauthorized' })
  @ApiResponse({ status: ErrorCodes.Forbidden, description: 'Forbidden' })
  @ApiResponse({ status: ErrorCodes.NotFound, description: 'Not Found' })
  async createProduct(@Body() product: CreateStockProductDto) {
    const response = await this.stockProductService.createProduct(product);
    const formattedResponse = formatResponse(response, {
      id: response.stockProductID,
    });
    return formattedResponse;
  }

  @Put('list/:id')
  @ApiOperation({
    summary: 'Add a product to the shopping list',
  })
  @ApiParam({ name: 'id', description: 'Stock product ID' })
  @ApiBody({ description: 'Product data', type: CreateStockProductDto })
  @ApiResponse({
    status: SuccessCodes.Ok,
    description: 'Product updated successfully',
  })
  @ApiResponse({ status: ErrorCodes.BadRequest, description: 'Bad Request' })
  @ApiResponse({ status: ErrorCodes.Unauthorized, description: 'Unauthorized' })
  @ApiResponse({ status: ErrorCodes.Forbidden, description: 'Forbidden' })
  @ApiResponse({ status: ErrorCodes.NotFound, description: 'Not Found' })
  async addProductToShoppingList(@Param('id') id: string) {
    const response =
      await this.stockProductService.addProductToShoppingList(id);
    const formattedResponse = formatResponse(response, { id });
    return formattedResponse;
  }

  @Put('amount/:id')
  @ApiOperation({
    summary: `Update an existing product's amount`,
  })
  @ApiParam({ name: 'id', description: 'Product ID' })
  @ApiQuery({ name: 'amount', description: 'New amount', type: 'number' })
  @ApiResponse({
    status: SuccessCodes.Ok,
    description: 'Product updated successfully',
  })
  @ApiResponse({ status: ErrorCodes.BadRequest, description: 'Bad Request' })
  @ApiResponse({ status: ErrorCodes.Unauthorized, description: 'Unauthorized' })
  @ApiResponse({ status: ErrorCodes.Forbidden, description: 'Forbidden' })
  @ApiResponse({ status: ErrorCodes.NotFound, description: 'Not Found' })
  async modifyAmount(@Param('id') id: string, @Query('amount') amount: number) {
    const response = await this.stockProductService.modifyAmount(id, amount);
    const formattedResponse = formatResponse(response, { id });
    return formattedResponse;
  }

  @Put(':id')
  @UsePipes(dtoValidator())
  @ApiOperation({
    summary: 'Update an existing product',
  })
  @ApiParam({ name: 'id', description: 'Product ID' })
  @ApiBody({ description: 'Product data', type: CreateStockProductDto })
  @ApiResponse({
    status: SuccessCodes.Ok,
    description: 'Product updated successfully',
  })
  @ApiResponse({ status: ErrorCodes.BadRequest, description: 'Bad Request' })
  @ApiResponse({ status: ErrorCodes.Unauthorized, description: 'Unauthorized' })
  @ApiResponse({ status: ErrorCodes.Forbidden, description: 'Forbidden' })
  @ApiResponse({ status: ErrorCodes.NotFound, description: 'Not Found' })
  async updateProduct(
    @Param('id') id: string,
    @Body() product: CreateStockProductDto,
  ) {
    const response = await this.stockProductService.updateProduct(id, product);
    const formattedResponse = formatResponse(response, { id });
    return formattedResponse;
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete an existing product',
  })
  @ApiParam({ name: 'id', description: 'Product ID' })
  @ApiResponse({
    status: SuccessCodes.NoContent,
    description: 'Product deleted successfully',
  })
  @ApiResponse({ status: ErrorCodes.BadRequest, description: 'Bad Request' })
  @ApiResponse({ status: ErrorCodes.Unauthorized, description: 'Unauthorized' })
  @ApiResponse({ status: ErrorCodes.Forbidden, description: 'Forbidden' })
  @ApiResponse({ status: ErrorCodes.NotFound, description: 'Not Found' })
  async deleteProduct(@Param('id') id: string) {
    await this.stockProductService.deleteProduct(id);
    const formattedResponse = formatResponse(null, { id });
    return formattedResponse;
  }
}
