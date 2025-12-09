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
import {
  CreateIngredientDto,
  CreateRecipeDto,
  CreateStepDto,
} from '@/api/home-management/entities/dtos/recipe.dto';
import { RecipeService } from './recipes.service';
import {
  SuccessCodes,
  ErrorCodes,
} from '@/api/entities/enums/response-codes.enum';
import { CompositeAuthGuard } from '@/api/auth/guards/composite-auth.guard';

@ApiTags('Recipes')
@Controller()
@UseGuards(CompositeAuthGuard)
export class RecipeController {
  constructor(
    private readonly logger: Logger,
    private readonly recipeService: RecipeService,
  ) {}

  @Get('status')
  status() {
    return this.recipeService.status();
  }

  @Get('all')
  @ApiOperation({ summary: 'Get all recipes' })
  @ApiResponse({
    status: SuccessCodes.Ok,
    description: 'Recipe(s) retrieved successfully',
  })
  @ApiResponse({ status: ErrorCodes.BadRequest, description: 'Bad Request' })
  @ApiResponse({ status: ErrorCodes.Unauthorized, description: 'Unauthorized' })
  @ApiResponse({ status: ErrorCodes.Forbidden, description: 'Forbidden' })
  @ApiResponse({ status: ErrorCodes.NotFound, description: 'Not Found' })
  async findAllRecipes() {
    const response = await this.recipeService.findAllRecipes();
    const formattedResponse = formatResponse(response.entities, {
      total: response.total,
    });
    return formattedResponse;
  }

  @Get('names')
  @ApiOperation({ summary: 'Get all recipe names' })
  @ApiResponse({
    status: SuccessCodes.Ok,
    description: 'Names retrieved successfully',
  })
  @ApiResponse({ status: ErrorCodes.BadRequest, description: 'Bad Request' })
  @ApiResponse({ status: ErrorCodes.Unauthorized, description: 'Unauthorized' })
  @ApiResponse({ status: ErrorCodes.Forbidden, description: 'Forbidden' })
  @ApiResponse({ status: ErrorCodes.NotFound, description: 'Not Found' })
  async findAllRecipeNames() {
    const response = await this.recipeService.findAllRecipeNames();
    const formattedResponse = formatResponse(response);
    return formattedResponse;
  }

  @Get('id/:id')
  @ApiOperation({
    summary: 'Get a recipe by ID',
  })
  @ApiParam({ name: 'id', description: 'Recipe ID' })
  @ApiResponse({
    status: SuccessCodes.Ok,
    description: 'Recipe(s) retrieved successfully',
  })
  @ApiResponse({ status: ErrorCodes.BadRequest, description: 'Bad Request' })
  @ApiResponse({ status: ErrorCodes.Unauthorized, description: 'Unauthorized' })
  @ApiResponse({ status: ErrorCodes.Forbidden, description: 'Forbidden' })
  @ApiResponse({ status: ErrorCodes.NotFound, description: 'Not Found' })
  async getRecipeById(@Param('id') id: string) {
    const response = await this.recipeService.getRecipeById(id);
    const formattedResponse = formatResponse(response, { id });
    return formattedResponse;
  }

  @Get('/ingredient/id/:id')
  @ApiOperation({
    summary: 'Get a recipe ingredient by ID',
  })
  @ApiParam({ name: 'id', description: 'Recipe ID' })
  @ApiResponse({
    status: SuccessCodes.Ok,
    description: 'Recipe ingredient(s) retrieved successfully',
  })
  @ApiResponse({ status: ErrorCodes.BadRequest, description: 'Bad Request' })
  @ApiResponse({ status: ErrorCodes.Unauthorized, description: 'Unauthorized' })
  @ApiResponse({ status: ErrorCodes.Forbidden, description: 'Forbidden' })
  @ApiResponse({ status: ErrorCodes.NotFound, description: 'Not Found' })
  async getIngredientByID(@Param('id') id: string) {
    const response = await this.recipeService.getIngredientByID(id);
    const formattedResponse = formatResponse(response, { id });
    return formattedResponse;
  }

  @Get('/step/id/:id')
  @ApiOperation({
    summary: 'Get a recipe step by ID',
  })
  @ApiParam({ name: 'id', description: 'Recipe ID' })
  @ApiResponse({
    status: SuccessCodes.Ok,
    description: 'Recipe step(s) retrieved successfully',
  })
  @ApiResponse({ status: ErrorCodes.BadRequest, description: 'Bad Request' })
  @ApiResponse({ status: ErrorCodes.Unauthorized, description: 'Unauthorized' })
  @ApiResponse({ status: ErrorCodes.Forbidden, description: 'Forbidden' })
  @ApiResponse({ status: ErrorCodes.NotFound, description: 'Not Found' })
  async getStepByID(@Param('id') id: string) {
    const response = await this.recipeService.getStepByID(id);
    const formattedResponse = formatResponse(response, { id });
    return formattedResponse;
  }

  @Get('')
  @ApiOperation({
    summary: 'Get recipes with pagination and optional search criteria',
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
    description: 'Recipe(s) retrieved successfully',
  })
  @ApiResponse({ status: ErrorCodes.BadRequest, description: 'Bad Request' })
  @ApiResponse({ status: ErrorCodes.Unauthorized, description: 'Unauthorized' })
  @ApiResponse({ status: ErrorCodes.Forbidden, description: 'Forbidden' })
  @ApiResponse({ status: ErrorCodes.NotFound, description: 'Not Found' })
  async getRecipes(
    @Query('page', new ValidatePaginationPipe()) page: number = 0,
    @Query('limit', new ValidatePaginationPipe()) limit: number = 50,
    @Query('searchCriteria', new ValidateSearchCriteriaPipe())
    searchCriteria?: string,
  ) {
    const searchCriteriaObj: SearchCriteriaI = JSON.parse(
      decodeURIComponent(searchCriteria),
    );
    const response = await this.recipeService.getRecipes(
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
    summary: 'Create a new recipe',
  })
  @ApiBody({ description: 'Recipe data', type: CreateRecipeDto })
  @ApiResponse({
    status: SuccessCodes.Created,
    description: 'Recipe created successfully',
  })
  @ApiResponse({ status: ErrorCodes.BadRequest, description: 'Bad Request' })
  @ApiResponse({ status: ErrorCodes.Unauthorized, description: 'Unauthorized' })
  @ApiResponse({ status: ErrorCodes.Forbidden, description: 'Forbidden' })
  @ApiResponse({ status: ErrorCodes.NotFound, description: 'Not Found' })
  async createRecipe(@Body() recipe: CreateRecipeDto) {
    const response = await this.recipeService.createRecipe(recipe);
    const formattedResponse = formatResponse(response, {
      id: response.recipeID,
    });
    return formattedResponse;
  }

  @Post('ingredient')
  @UsePipes(dtoValidator())
  @ApiOperation({
    summary: 'Create a new ingredient',
  })
  @ApiBody({ description: 'Recipe data', type: CreateRecipeDto })
  @ApiResponse({
    status: SuccessCodes.Created,
    description: 'Recipe created successfully',
  })
  @ApiResponse({ status: ErrorCodes.BadRequest, description: 'Bad Request' })
  @ApiResponse({ status: ErrorCodes.Unauthorized, description: 'Unauthorized' })
  @ApiResponse({ status: ErrorCodes.Forbidden, description: 'Forbidden' })
  @ApiResponse({ status: ErrorCodes.NotFound, description: 'Not Found' })
  async createIngredient(@Body() ingredient: CreateIngredientDto) {
    const response = await this.recipeService.createIngredient(ingredient);
    const formattedResponse = formatResponse(response, {
      id: response.recipeIngredientID,
    });
    return formattedResponse;
  }

  @Post('step')
  @UsePipes(dtoValidator())
  @ApiOperation({
    summary: 'Create a new step',
  })
  @ApiBody({ description: 'Recipe data', type: CreateRecipeDto })
  @ApiResponse({
    status: SuccessCodes.Created,
    description: 'Recipe created successfully',
  })
  @ApiResponse({ status: ErrorCodes.BadRequest, description: 'Bad Request' })
  @ApiResponse({ status: ErrorCodes.Unauthorized, description: 'Unauthorized' })
  @ApiResponse({ status: ErrorCodes.Forbidden, description: 'Forbidden' })
  @ApiResponse({ status: ErrorCodes.NotFound, description: 'Not Found' })
  async createStep(@Body() step: CreateStepDto) {
    const response = await this.recipeService.createStep(step);
    const formattedResponse = formatResponse(response, {
      id: response.recipeStepID,
    });
    return formattedResponse;
  }

  @Put(':id')
  @UsePipes(dtoValidator())
  @ApiOperation({
    summary: 'Update an existing recipe',
  })
  @ApiParam({ name: 'id', description: 'Recipe ID' })
  @ApiBody({ description: 'Recipe data', type: CreateRecipeDto })
  @ApiResponse({
    status: SuccessCodes.Ok,
    description: 'Recipe updated successfully',
  })
  @ApiResponse({ status: ErrorCodes.BadRequest, description: 'Bad Request' })
  @ApiResponse({ status: ErrorCodes.Unauthorized, description: 'Unauthorized' })
  @ApiResponse({ status: ErrorCodes.Forbidden, description: 'Forbidden' })
  @ApiResponse({ status: ErrorCodes.NotFound, description: 'Not Found' })
  async updateRecipe(@Param('id') id: string, @Body() recipe: CreateRecipeDto) {
    const response = await this.recipeService.updateRecipe(id, recipe);
    const formattedResponse = formatResponse(response, { id });
    return formattedResponse;
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete an existing recipe',
  })
  @ApiParam({ name: 'id', description: 'Recipe ID' })
  @ApiResponse({
    status: SuccessCodes.NoContent,
    description: 'Recipe deleted successfully',
  })
  @ApiResponse({ status: ErrorCodes.BadRequest, description: 'Bad Request' })
  @ApiResponse({ status: ErrorCodes.Unauthorized, description: 'Unauthorized' })
  @ApiResponse({ status: ErrorCodes.Forbidden, description: 'Forbidden' })
  @ApiResponse({ status: ErrorCodes.NotFound, description: 'Not Found' })
  async deleteRecipe(@Param('id') id: string) {
    await this.recipeService.deleteRecipe(id);
    const formattedResponse = formatResponse(null, { id });
    return formattedResponse;
  }

  @Delete('ingredient/:id')
  @ApiOperation({
    summary: 'Delete an existing ingredient',
  })
  @ApiParam({ name: 'id', description: 'Recipe ID' })
  @ApiResponse({
    status: SuccessCodes.NoContent,
    description: 'Recipe deleted successfully',
  })
  @ApiResponse({ status: ErrorCodes.BadRequest, description: 'Bad Request' })
  @ApiResponse({ status: ErrorCodes.Unauthorized, description: 'Unauthorized' })
  @ApiResponse({ status: ErrorCodes.Forbidden, description: 'Forbidden' })
  @ApiResponse({ status: ErrorCodes.NotFound, description: 'Not Found' })
  async deleteIngredient(@Param('id') id: string) {
    await this.recipeService.deleteIngredient(id);
    const formattedResponse = formatResponse(null, { id });
    return formattedResponse;
  }

  @Delete('step/:id')
  @ApiOperation({
    summary: 'Delete an existing step',
  })
  @ApiParam({ name: 'id', description: 'Recipe ID' })
  @ApiResponse({
    status: SuccessCodes.NoContent,
    description: 'Recipe deleted successfully',
  })
  @ApiResponse({ status: ErrorCodes.BadRequest, description: 'Bad Request' })
  @ApiResponse({ status: ErrorCodes.Unauthorized, description: 'Unauthorized' })
  @ApiResponse({ status: ErrorCodes.Forbidden, description: 'Forbidden' })
  @ApiResponse({ status: ErrorCodes.NotFound, description: 'Not Found' })
  async deleteStep(@Param('id') id: string) {
    await this.recipeService.deleteStep(id);
    const formattedResponse = formatResponse(null, { id });
    return formattedResponse;
  }
}
