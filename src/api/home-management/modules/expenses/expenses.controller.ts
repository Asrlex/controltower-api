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
} from '@nestjs/common';
import {
    ApiBody,
    ApiOperation,
    ApiParam,
    ApiQuery,
    ApiResponse,
    ApiTags,
} from '@nestjs/swagger';
import { formatResponse } from '@/common/utils/utils.api';
import { ValidatePaginationPipe } from '@/common/pipes/pagination.pipe';
import { ValidateSearchCriteriaPipe } from '@/common/pipes/search.pipe';
import { SearchCriteriaI } from '@/api/entities/interfaces/api.entity';
import { CreateExpenseDto } from '@/api/home-management/entities/dtos/expense.dto';
import { ExpenseService } from './expenses.service';
import {
    SuccessCodes,
    ErrorCodes,
} from '@/api/entities/enums/response-codes.enum';
import { CompositeAuthGuard } from '@/api/auth/guards/composite-auth.guard';

@ApiTags('Expenses')
@Controller()
@UseGuards(CompositeAuthGuard)
export class ExpenseController {
    constructor(
        private readonly logger: Logger,
        private readonly expenseService: ExpenseService,
    ) {}

    @Get('status')
    status() {
        return this.expenseService.status();
    }

    @Get('all')
    @ApiOperation({ summary: 'Get all expenses' })
    @ApiResponse({
        status: SuccessCodes.Ok,
        description: 'Expense(s) retrieved successfully',
    })
    @ApiResponse({ status: ErrorCodes.BadRequest, description: 'Bad Request' })
    @ApiResponse({
        status: ErrorCodes.Unauthorized,
        description: 'Unauthorized',
    })
    @ApiResponse({ status: ErrorCodes.Forbidden, description: 'Forbidden' })
    @ApiResponse({ status: ErrorCodes.NotFound, description: 'Not Found' })
    async findAllExpenses() {
        const response = await this.expenseService.findAllExpenses();
        const formattedResponse = formatResponse(response.entities, {
            total: response.total,
        });
        return formattedResponse;
    }

    @Get('all/categories')
    @ApiOperation({ summary: 'Get all expense categories' })
    @ApiResponse({
        status: SuccessCodes.Ok,
        description: 'Expense(s) retrieved successfully',
    })
    @ApiResponse({ status: ErrorCodes.BadRequest, description: 'Bad Request' })
    @ApiResponse({
        status: ErrorCodes.Unauthorized,
        description: 'Unauthorized',
    })
    @ApiResponse({ status: ErrorCodes.Forbidden, description: 'Forbidden' })
    @ApiResponse({ status: ErrorCodes.NotFound, description: 'Not Found' })
    async findAllExpenseCategories() {
        const response = await this.expenseService.findAllExpenseCategories();
        const formattedResponse = formatResponse(response);
        return formattedResponse;
    }

    @Get('id/:id')
    @ApiOperation({
        summary: 'Get expense by ID',
    })
    @ApiParam({ name: 'id', description: 'Expense ID' })
    @ApiResponse({
        status: SuccessCodes.Ok,
        description: 'Expense(s) retrieved successfully',
    })
    @ApiResponse({ status: ErrorCodes.BadRequest, description: 'Bad Request' })
    @ApiResponse({
        status: ErrorCodes.Unauthorized,
        description: 'Unauthorized',
    })
    @ApiResponse({ status: ErrorCodes.Forbidden, description: 'Forbidden' })
    @ApiResponse({ status: ErrorCodes.NotFound, description: 'Not Found' })
    async getExpenseById(@Param('id') id: string) {
        const response = await this.expenseService.getExpenseById(id);
        const formattedResponse = formatResponse(response, {});
        return formattedResponse;
    }

    @Get('month/:month')
    @ApiOperation({
        summary: 'Get expense by month',
    })
    @ApiParam({ name: 'id', description: 'Expense month' })
    @ApiResponse({
        status: SuccessCodes.Ok,
        description: 'Expense(s) retrieved successfully',
    })
    @ApiResponse({ status: ErrorCodes.BadRequest, description: 'Bad Request' })
    @ApiResponse({
        status: ErrorCodes.Unauthorized,
        description: 'Unauthorized',
    })
    @ApiResponse({ status: ErrorCodes.Forbidden, description: 'Forbidden' })
    @ApiResponse({ status: ErrorCodes.NotFound, description: 'Not Found' })
    async getExpensesByMonth(@Param('month') month: string) {
        const response = await this.expenseService.getExpensesByMonth(month);
        const formattedResponse = formatResponse(response, {});
        return formattedResponse;
    }

    @Get('')
    @ApiOperation({ summary: 'Get expenses' })
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
        description: 'Expense(s) retrieved successfully',
    })
    @ApiResponse({ status: ErrorCodes.BadRequest, description: 'Bad Request' })
    @ApiResponse({
        status: ErrorCodes.Unauthorized,
        description: 'Unauthorized',
    })
    @ApiResponse({ status: ErrorCodes.Forbidden, description: 'Forbidden' })
    @ApiResponse({ status: ErrorCodes.NotFound, description: 'Not Found' })
    async getExpenses(
        @Query('page', new ValidatePaginationPipe()) page: number = 0,
        @Query('limit', new ValidatePaginationPipe()) limit: number = 50,
        @Query('searchCriteria', new ValidateSearchCriteriaPipe())
        searchCriteria?: string,
    ) {
        const searchCriteriaObj: SearchCriteriaI = JSON.parse(
            decodeURIComponent(searchCriteria),
        );
        const response = await this.expenseService.getExpenses(
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
    @ApiOperation({ summary: 'Create expense' })
    @ApiBody({ description: 'Expense data', type: CreateExpenseDto })
    @ApiResponse({
        status: SuccessCodes.Created,
        description: 'Expense created successfully',
    })
    @ApiResponse({ status: ErrorCodes.BadRequest, description: 'Bad Request' })
    @ApiResponse({
        status: ErrorCodes.Unauthorized,
        description: 'Unauthorized',
    })
    @ApiResponse({ status: ErrorCodes.Forbidden, description: 'Forbidden' })
    @ApiResponse({ status: ErrorCodes.NotFound, description: 'Not Found' })
    async createExpense(@Body() dto: CreateExpenseDto) {
        const response = await this.expenseService.createExpense(dto);
        const formattedResponse = formatResponse(response, {
            id: response.expenseID,
        });
        return formattedResponse;
    }

    @Put(':id')
    @ApiOperation({
        summary: 'Update expense',
    })
    @ApiParam({ name: 'id', description: 'Expense ID' })
    @ApiBody({ description: 'Expense data', type: CreateExpenseDto })
    @ApiResponse({
        status: SuccessCodes.Ok,
        description: 'Expense updated successfully',
    })
    @ApiResponse({ status: ErrorCodes.BadRequest, description: 'Bad Request' })
    @ApiResponse({
        status: ErrorCodes.Unauthorized,
        description: 'Unauthorized',
    })
    @ApiResponse({ status: ErrorCodes.Forbidden, description: 'Forbidden' })
    @ApiResponse({ status: ErrorCodes.NotFound, description: 'Not Found' })
    async updateExpense(
        @Param('id') id: string,
        @Body() dto: CreateExpenseDto,
    ) {
        const response = await this.expenseService.updateExpense(id, dto);
        const formattedResponse = formatResponse(response, {});
        return formattedResponse;
    }

    @Delete(':id')
    @ApiOperation({
        summary: 'Delete expense',
    })
    @ApiParam({ name: 'id', description: 'Expense ID' })
    @ApiResponse({
        status: SuccessCodes.NoContent,
        description: 'Expense deleted successfully',
    })
    @ApiResponse({ status: ErrorCodes.BadRequest, description: 'Bad Request' })
    @ApiResponse({
        status: ErrorCodes.Unauthorized,
        description: 'Unauthorized',
    })
    @ApiResponse({ status: ErrorCodes.Forbidden, description: 'Forbidden' })
    @ApiResponse({ status: ErrorCodes.NotFound, description: 'Not Found' })
    async deleteExpense(@Param('id') id: string) {
        const response = await this.expenseService.deleteExpense(id);
        const formattedResponse = formatResponse(response, {});
        return formattedResponse;
    }
}
