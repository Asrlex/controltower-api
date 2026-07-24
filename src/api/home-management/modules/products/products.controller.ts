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
import { ProductService } from './products.service';
import { CreateProductDto } from '@/api/home-management/entities/dtos/product.dto';
import {
    SuccessCodes,
    ErrorCodes,
} from '@/api/entities/enums/response-codes.enum';
import { CompositeAuthGuard } from '@/api/auth/guards/composite-auth.guard';

@ApiTags('Products')
@Controller()
@UseGuards(CompositeAuthGuard)
export class ProductController {
    constructor(
        private readonly logger: Logger,
        private readonly productService: ProductService,
    ) {}

    @Get('status')
    status() {
        return this.productService.status();
    }

    @Get('all')
    @ApiOperation({ summary: 'Get all products' })
    @ApiResponse({
        status: SuccessCodes.Ok,
        description: 'Product(s) retrieved successfully',
    })
    @ApiResponse({ status: ErrorCodes.BadRequest, description: 'Bad Request' })
    @ApiResponse({
        status: ErrorCodes.Unauthorized,
        description: 'Unauthorized',
    })
    @ApiResponse({ status: ErrorCodes.Forbidden, description: 'Forbidden' })
    @ApiResponse({ status: ErrorCodes.NotFound, description: 'Not Found' })
    async findAllProducts() {
        const response = await this.productService.findAllProducts();
        const formattedResponse = formatResponse(response.entities, {
            total: response.total,
        });
        return formattedResponse;
    }

    @Get('id/:id')
    @ApiOperation({
        summary: 'Get product by ID',
    })
    @ApiParam({ name: 'id', description: 'Product ID' })
    @ApiResponse({
        status: SuccessCodes.Ok,
        description: 'Product(s) retrieved successfully',
    })
    @ApiResponse({ status: ErrorCodes.BadRequest, description: 'Bad Request' })
    @ApiResponse({
        status: ErrorCodes.Unauthorized,
        description: 'Unauthorized',
    })
    @ApiResponse({ status: ErrorCodes.Forbidden, description: 'Forbidden' })
    @ApiResponse({ status: ErrorCodes.NotFound, description: 'Not Found' })
    async getProductById(@Param('id') id: string) {
        const response = await this.productService.getProductById(id);
        const formattedResponse = formatResponse(response, { id });
        return formattedResponse;
    }

    @Get()
    @ApiOperation({
        summary: 'Get products with pagination and optional search criteria',
    })
    @ApiQuery({ name: 'page', description: 'Requested page', type: 'number' })
    @ApiQuery({
        name: 'limit',
        description: 'Elements per page',
        type: 'number',
    })
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
    @ApiResponse({
        status: ErrorCodes.Unauthorized,
        description: 'Unauthorized',
    })
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
        const response = await this.productService.getProducts(
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

    @Get('order/:type')
    @ApiOperation({
        summary: 'Get order of products',
    })
    @ApiParam({ name: 'type', description: 'Order type' })
    @ApiResponse({
        status: SuccessCodes.Ok,
        description: 'Product order retrieved successfully',
    })
    @ApiResponse({ status: ErrorCodes.BadRequest, description: 'Bad Request' })
    @ApiResponse({
        status: ErrorCodes.Unauthorized,
        description: 'Unauthorized',
    })
    @ApiResponse({ status: ErrorCodes.Forbidden, description: 'Forbidden' })
    @ApiResponse({ status: ErrorCodes.NotFound, description: 'Not Found' })
    async getOrderProducts(@Param('type') type: string) {
        const response = await this.productService.getOrderProducts(type);
        const formattedResponse = formatResponse(response, { id: type });
        return formattedResponse;
    }

    @Post('order/:type')
    @ApiOperation({
        summary: 'Post order of products',
    })
    @ApiParam({ name: 'type', description: 'Order type' })
    @ApiBody({ description: 'Order data', type: [String] })
    @ApiResponse({
        status: SuccessCodes.Created,
        description: 'Product order sent successfully',
    })
    @ApiResponse({ status: ErrorCodes.BadRequest, description: 'Bad Request' })
    @ApiResponse({
        status: ErrorCodes.Unauthorized,
        description: 'Unauthorized',
    })
    @ApiResponse({ status: ErrorCodes.Forbidden, description: 'Forbidden' })
    @ApiResponse({ status: ErrorCodes.NotFound, description: 'Not Found' })
    async postOrderProducts(
        @Param('type') type: string,
        @Body() order: string[],
    ) {
        const response = await this.productService.postOrderProducts(
            type,
            order,
        );
        const formattedResponse = formatResponse(response, { id: type });
        return formattedResponse;
    }

    @Post('')
    @UsePipes(dtoValidator())
    @ApiOperation({
        summary: 'Create a new product',
    })
    @ApiBody({ description: 'Product data', type: CreateProductDto })
    @ApiResponse({
        status: SuccessCodes.Created,
        description: 'Product created successfully',
    })
    @ApiResponse({ status: ErrorCodes.BadRequest, description: 'Bad Request' })
    @ApiResponse({
        status: ErrorCodes.Unauthorized,
        description: 'Unauthorized',
    })
    @ApiResponse({ status: ErrorCodes.Forbidden, description: 'Forbidden' })
    @ApiResponse({ status: ErrorCodes.NotFound, description: 'Not Found' })
    async createProduct(@Body() product: CreateProductDto) {
        const response = await this.productService.createProduct(product);
        const formattedResponse = formatResponse(response, {
            id: response.productID,
        });
        return formattedResponse;
    }

    @Put(':id')
    @UsePipes(dtoValidator())
    @ApiOperation({
        summary: 'Update an existing product',
    })
    @ApiParam({ name: 'id', description: 'Product ID' })
    @ApiBody({ description: 'Product data', type: CreateProductDto })
    @ApiResponse({
        status: SuccessCodes.Ok,
        description: 'Product updated successfully',
    })
    @ApiResponse({ status: ErrorCodes.BadRequest, description: 'Bad Request' })
    @ApiResponse({
        status: ErrorCodes.Unauthorized,
        description: 'Unauthorized',
    })
    @ApiResponse({ status: ErrorCodes.Forbidden, description: 'Forbidden' })
    @ApiResponse({ status: ErrorCodes.NotFound, description: 'Not Found' })
    async updateProduct(
        @Param('id') id: string,
        @Body() product: CreateProductDto,
    ) {
        const response = await this.productService.updateProduct(id, product);
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
    @ApiResponse({
        status: ErrorCodes.Unauthorized,
        description: 'Unauthorized',
    })
    @ApiResponse({ status: ErrorCodes.Forbidden, description: 'Forbidden' })
    @ApiResponse({ status: ErrorCodes.NotFound, description: 'Not Found' })
    async deleteProduct(@Param('id') id: string) {
        await this.productService.deleteProduct(id);
        const formattedResponse = formatResponse(null, { id });
        return formattedResponse;
    }
}
