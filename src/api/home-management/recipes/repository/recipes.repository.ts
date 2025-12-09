import { Inject, Logger, NotFoundException } from '@nestjs/common';
import { DatabaseConnection } from 'src/db/database.connection';
import { SortI } from 'src/api/entities/interfaces/api.entity';
import { plainToInstance } from 'class-transformer';
import {
  CreateIngredientDto,
  CreateRecipeDto,
  CreateStepDto,
  GetRecipeDto,
} from '@/api/entities/dtos/home-management/recipe.dto';
import {
  RecipeDetailI,
  RecipeIngredientI,
  RecipeNameI,
  RecipeStepI,
} from '@/api/home-management/entities/interfaces/home-management.entity';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { BaseRepository } from '@/common/repository/base-repository';
import { RecipeRepository } from './recipes.repository.interface';
import { recipesQueries } from '@/db/queries/recipes.queries';

export class RecipeRepositoryImplementation
  extends BaseRepository
  implements RecipeRepository
{
  constructor(
    @Inject('HOME_MANAGEMENT_CONNECTION')
    private readonly homeManagementDbConnection: DatabaseConnection,
    private readonly logger: Logger,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {
    super(homeManagementDbConnection);
  }

  /**
   * Método para obtener todas las recetas
   * @returns string - todas las recetas
   */
  async findAll(): Promise<{
    entities: RecipeDetailI[];
    total: number;
  }> {
    const cacheKey = 'recipes';
    if (this.cacheManager) {
      const cachedRecipes: {
        entities: RecipeDetailI[];
        total: number;
      } = await this.cacheManager.get(cacheKey);
      if (cachedRecipes) {
        this.logger.log('Recipes cache hit');
        return cachedRecipes;
      }
    }
    const sql = recipesQueries.findAll;
    const result = await this.homeManagementDbConnection.execute(sql);
    const entities: RecipeDetailI[] = this.resultToRecipe(result);
    const total = result[0] ? parseInt(result[0].total, 10) : 0;
    if (this.cacheManager) {
      await this.cacheManager.set(cacheKey, {
        entities,
        total,
      });
    }
    return {
      entities,
      total,
    };
  }

  /**
   * Método para obtener todos los nombres de las recetas
   * @returns string - todos los nombres de las recetas
   */
  async findAllNames(): Promise<RecipeNameI[]> {
    const sql = recipesQueries.findAllNames;
    const result = await this.homeManagementDbConnection.execute(sql);
    const entities: RecipeNameI[] = this.resultToRecipeName(result);
    return entities;
  }

  /**
   * Método para obtener lista de recetas filtradas
   * @returns string - lista de recetas filtradas
   */
  async find(
    page: number,
    limit: number,
    searchCriteria: any,
  ): Promise<{ entities: RecipeDetailI[]; total: number }> {
    let filters = '';
    let sort: SortI = { field: 'customerName', order: 'DESC' };
    if (searchCriteria) {
      const sqlFilters = this.filterstoSQL(searchCriteria);
      filters = this.addSearchToFilters(
        sqlFilters.filters,
        searchCriteria.search,
      );
      sort = sqlFilters.sort || sort;
    }
    const offset: number = page * limit + 1;
    limit = offset + parseInt(limit.toString(), 10) - 1;
    const sql = recipesQueries.find
      .replaceAll('@DynamicWhereClause', filters)
      .replaceAll('@DynamicOrderByField', `${sort.field}`)
      .replaceAll('@DynamicOrderByDirection', `${sort.order}`)
      .replace('@start', offset.toString())
      .replace('@end', limit.toString());
    const result = await this.homeManagementDbConnection.execute(sql);
    const entities: RecipeDetailI[] = this.resultToRecipe(result);
    return {
      entities,
      total: result[0] ? parseInt(result[0].total, 10) : 0,
    };
  }

  /**
   * Método para obtener un receta por su id
   * @param id - id de la receta
   * @returns string
   */
  async findById(id: string): Promise<RecipeDetailI | null> {
    const cacheKey = `recipe-${id}`;
    if (this.cacheManager) {
      const cachedRecipe: RecipeDetailI = await this.cacheManager.get(cacheKey);
      if (cachedRecipe) {
        this.logger.log(`Recipe ${id} cache hit`);
        return cachedRecipe;
      }
    }
    const sql = recipesQueries.findByID.replace('@id', id);
    const result = await this.homeManagementDbConnection.execute(sql);
    const entities: RecipeDetailI[] = this.resultToRecipe(result);
    return entities.length > 0 ? entities[0] : null;
  }

  /**
   * Método para obtener un ingrediente por su id
   * @param ingredientID - id del ingrediente
   * @returns string
   */
  async findIngredientByID(ingredientID: string): Promise<RecipeIngredientI> {
    const sql = recipesQueries.findByIDIngredient.replace(
      '@id',
      ingredientID.toString(),
    );
    const result = await this.homeManagementDbConnection.execute(sql);
    const entities: RecipeIngredientI[] = this.resultToIngredient(result);
    return entities.length > 0 ? entities[0] : null;
  }

  /**
   * Método para obtener un paso por su id
   * @param stepID - id del paso
   * @returns string
   */
  async findStepByID(stepID: string): Promise<RecipeStepI> {
    const sql = recipesQueries.findByIDStep.replace('@id', stepID.toString());
    const result = await this.homeManagementDbConnection.execute(sql);
    const entities: RecipeStepI[] = this.resultToStep(result);
    return entities.length > 0 ? entities[0] : null;
  }

  /**
   * Metodo para crear una nueva receta
   * @returns string - receta creada
   */
  async create(dto: CreateRecipeDto): Promise<RecipeDetailI> {
    dto = this.prepareDTO(dto);
    const sqlRecipe = recipesQueries.create.replace(
      '@InsertValues',
      `'${dto.recipeName}', '${dto.recipeDescription}'`,
    );
    const responseRecipe =
      await this.homeManagementDbConnection.execute(sqlRecipe);
    const recipeID = responseRecipe[0].id;
    if (dto.ingredients) {
      dto.ingredients.forEach(async (ingredient) => {
        ingredient.recipeID = recipeID;
        await this.createIngredient(ingredient);
      });
    }

    if (dto.steps) {
      dto.steps.forEach(async (step) => {
        step.recipeID = recipeID;
        await this.createStep(step);
      });
    }

    const newRecipe: RecipeDetailI = await this.findById(recipeID);

    const recipes: { entities: RecipeDetailI[]; total: number } =
      await this.cacheManager.get('recipes');
    if (recipes) {
      recipes.entities.push(newRecipe);
      await this.cacheManager.set('recipes', recipes);
    }

    await this.saveLog('insert', 'recipe', `Created recipe ${recipeID}`);
    return newRecipe;
  }

  /**
   * Método para añadir un ingrediente a una receta
   * @param dto - DTO del ingrediente
   * @returns string - ingrediente añadido
   */
  async createIngredient(dto: CreateIngredientDto): Promise<RecipeIngredientI> {
    const sqlIngredient = recipesQueries.createIngredient.replace(
      '@InsertValues',
      `'${dto.recipeID}', '${dto.product.productID}', '${dto.recipeIngredientAmount}', '${dto.recipeIngredientUnit}'`,
    );
    const response =
      await this.homeManagementDbConnection.execute(sqlIngredient);
    const ingredientID = response[0].id;
    await this.saveLog(
      'insert',
      'ingredient',
      `Created ingredient ${ingredientID}`,
    );
    return this.findIngredientByID(ingredientID);
  }

  /**
   * Método para añadir un paso a una receta
   * @param dto - DTO del paso
   * @returns string - paso añadido
   */
  async createStep(dto: CreateStepDto): Promise<RecipeStepI> {
    const sqlStep = recipesQueries.createStep.replace(
      '@InsertValues',
      `'${dto.recipeID}', '${dto.recipeStepName}', '${dto.recipeStepDescription}', '${dto.recipeStepOrder}'`,
    );
    const response = await this.homeManagementDbConnection.execute(sqlStep);
    const stepID = response[0].id;

    await this.saveLog('insert', 'step', `Created step ${stepID}`);
    return this.findStepByID(stepID);
  }

  /**
   * Método para actualizar una receta
   * Si la receta no existe, se devuelve null
   * Si la receta no tiene cambios, se devuelve la receta original
   * @param id - id de la receta
   * @param product - receta
   * @returns string - receta actualizada
   */
  async modify(id: string, dto: CreateRecipeDto): Promise<RecipeDetailI> {
    const originalRecipe = await this.findById(id);
    if (!originalRecipe) {
      throw new NotFoundException('Recipe not found');
    }
    dto = this.prepareDTO(dto);

    const sqlRecipe = recipesQueries.update
      .replace('@name', dto.recipeName)
      .replace('@description', dto.recipeDescription)
      .replace('@id', id);
    await this.homeManagementDbConnection.execute(sqlRecipe);

    await this.modifyIngredients(dto.ingredients, originalRecipe);
    await this.modifySteps(dto.steps, originalRecipe);

    const editedRecipe: RecipeDetailI = await this.findById(id);

    const recipes: {
      entities: RecipeDetailI[];
      total: number;
    } = await this.cacheManager.get('recipes');
    if (recipes) {
      const index = recipes.entities.findIndex(
        (r: RecipeDetailI) => r.recipeID.toString() === id,
      );
      recipes.entities[index] = editedRecipe;
      await this.cacheManager.set('recipes', recipes);
    }

    await this.saveLog('update', 'recipe', `Modified recipe ${id}`);
    return editedRecipe;
  }

  /**
   * Método para actualizar un ingrediente
   * Si el ingrediente no existe, se devuelve null
   * Si el ingrediente no tiene cambios, se devuelve el ingrediente original
   * @param id - id del ingrediente
   * @param product - ingrediente
   * @returns string - ingrediente actualizado
   */
  async modifyIngredients(
    dto: CreateIngredientDto[],
    original: RecipeDetailI,
  ): Promise<void> {
    const originalIngredients = original.ingredients.map(
      (ingredient) => ingredient.recipeIngredientID,
    );
    const newIngredients = dto.map(
      (ingredient) => ingredient.recipeIngredientID,
    );
    const ingredientsToDelete = originalIngredients.filter(
      (ingredient) => !newIngredients.includes(ingredient),
    );
    ingredientsToDelete.forEach(async (ingredient) => {
      await this.deleteIngredient(ingredient.toString());
    });
    dto.forEach(async (ingredient) => {
      if (!ingredient.recipeIngredientID) {
        await this.createIngredient(ingredient);
      } else {
        const sql = recipesQueries.updateIngredient
          .replace('@amount', ingredient.recipeIngredientAmount.toString())
          .replace('@unit', ingredient.recipeIngredientUnit);
        await this.homeManagementDbConnection.execute(sql);
      }
    });
  }

  /**
   * Método para actualizar un paso
   * Si el paso no existe, se devuelve null
   * Si el paso no tiene cambios, se devuelve el paso original
   * @param id - id del paso
   * @param product - paso
   * @returns string - paso actualizado
   */
  async modifySteps(
    dto: CreateStepDto[],
    original: RecipeDetailI,
  ): Promise<void> {
    const originalSteps = original.steps.map((step) => step.recipeStepID);
    const newSteps = dto.map((step) => step.recipeStepID);
    const stepsToDelete = originalSteps.filter(
      (step) => !newSteps.includes(step),
    );
    stepsToDelete.forEach(async (step) => {
      await this.deleteStep(step.toString());
    });
    dto.forEach(async (step) => {
      if (!step.recipeStepID) {
        await this.createStep(step);
      } else {
        const sql = recipesQueries.updateStep
          .replace('@name', step.recipeStepName)
          .replace('@description', step.recipeStepDescription)
          .replace('@order', step.recipeStepOrder.toString())
          .replace('@id', step.recipeStepID.toString());
        await this.homeManagementDbConnection.execute(sql);
      }
    });
  }

  /**
   * Método para eliminar un receta
   * @param id - id de la receta
   * @returns string - receta eliminada
   */
  async delete(id: string): Promise<void> {
    const originalRecipe = await this.findById(id);
    if (!originalRecipe) {
      throw new NotFoundException('Recipe not found');
    }
    const sql = recipesQueries.delete.replace('@id', id);
    await this.homeManagementDbConnection.execute(sql);

    const recipes: {
      entities: RecipeDetailI[];
      total: number;
    } = await this.cacheManager.get('recipes');
    if (recipes) {
      const index = recipes.entities.findIndex(
        (r: RecipeDetailI) => r.recipeID.toString() === id,
      );
      recipes.entities.splice(index, 1);
      await this.cacheManager.set('recipes', recipes);
    }

    await this.saveLog('delete', 'recipe', `Deleted recipe ${id}`);
  }

  /**
   * Método para eliminar un ingrediente
   * @param id - id del ingrediente
   * @returns string - ingrediente eliminado
   */
  async deleteIngredient(ingredientID: string): Promise<void> {
    const originalIngredient = await this.findIngredientByID(ingredientID);
    if (!originalIngredient) {
      throw new NotFoundException('Ingredient not found');
    }
    const sql = recipesQueries.deleteIngredient.replace(
      '@id',
      ingredientID.toString(),
    );
    console.log('sql', sql);
    await this.homeManagementDbConnection.execute(sql);

    await this.saveLog(
      'delete',
      'ingredient',
      `Deleted ingredient ${ingredientID}`,
    );
  }

  /**
   * Método para eliminar un paso
   * @param id - id del paso
   * @returns string - paso eliminado
   */
  async deleteStep(stepID: string): Promise<void> {
    const originalStep = await this.findStepByID(stepID);
    if (!originalStep) {
      throw new NotFoundException('Step not found');
    }
    const sql = recipesQueries.deleteStep.replace('@id', stepID.toString());
    await this.homeManagementDbConnection.execute(sql);
    await this.saveLog('delete', 'step', `Deleted step ${stepID}`);
  }

  /**
   * Método para inicializar valores opcionales del DTO
   * @param dto - DTO
   * @returns DTO
   */
  private prepareDTO(dto: CreateRecipeDto): CreateRecipeDto {
    dto = plainToInstance(CreateRecipeDto, dto, {
      exposeDefaultValues: true,
    });
    return dto;
  }

  /**
   * Método para convertir el resultado de la consulta a un array de recetas
   * @param result - resultado de la consulta
   * @returns array de recetas
   */
  private resultToRecipe(result: GetRecipeDto[]): RecipeDetailI[] {
    const mappedRecipe: Map<number, RecipeDetailI> = new Map();
    result.forEach((record: GetRecipeDto) => {
      let recipe: RecipeDetailI;
      if (mappedRecipe.has(record.recipeID)) {
        recipe = mappedRecipe.get(record.recipeID);
      } else {
        recipe = {
          recipeID: record.recipeID,
          recipeName: record.recipeName,
          recipeDescription: record.recipeDescription,
          ingredients: [],
          steps: [],
          tags: [],
        };
        mappedRecipe.set(record.recipeID, recipe);
      }

      if (
        record.tagID &&
        !recipe.tags.some((tag) => tag.tagID === record.tagID)
      ) {
        recipe.tags.push({
          tagID: record.tagID,
          tagName: record.tagName,
          tagType: record.tagType,
        });
      }

      if (
        record.ingredientID &&
        !recipe.ingredients.some(
          (ingredient) => ingredient.recipeIngredientID === record.ingredientID,
        )
      ) {
        recipe.ingredients.push({
          recipeIngredientID: record.ingredientID,
          recipeIngredientAmount: record.ingredientAmount,
          recipeIngredientUnit: record.ingredientUnit,
          recipeIngredientIsOptional: record.ingredientIsOptional,
          product: {
            productID: record.productID,
            productName: record.productName,
            productUnit: null,
            productDateLastConsumed: null,
            productDateLastBought: null,
            tags: [],
          },
        });
      }

      if (
        record.stepID &&
        !recipe.steps.some((step) => step.recipeStepID === record.stepID)
      ) {
        recipe.steps.push({
          recipeStepID: record.stepID,
          recipeStepName: record.stepName,
          recipeStepDescription: record.stepDescription,
          recipeStepOrder: record.stepOrder,
          recipeStepIsOptional: record.stepIsOptional,
        });
      }
    });
    return Array.from(mappedRecipe.values());
  }

  /**
   * Método para convertir el resultado de la consulta a un array de ingredientes
   * @param result - resultado de la consulta
   * @returns array de ingredientes
   */
  private resultToIngredient(result: GetRecipeDto[]): RecipeIngredientI[] {
    const mappedIngredient: Map<number, RecipeIngredientI> = new Map();
    result.forEach((record: GetRecipeDto) => {
      let ingredient: RecipeIngredientI;
      if (mappedIngredient.has(record.ingredientID)) {
        ingredient = mappedIngredient.get(record.ingredientID);
      } else {
        ingredient = {
          recipeIngredientID: record.ingredientID,
          recipeIngredientAmount: record.ingredientAmount,
          recipeIngredientUnit: record.ingredientUnit,
          recipeIngredientIsOptional: record.ingredientIsOptional,
          product: {
            productID: record.productID,
            productName: record.productName,
            productUnit: null,
            productDateLastConsumed: null,
            productDateLastBought: null,
            tags: [],
          },
        };
        mappedIngredient.set(record.ingredientID, ingredient);
      }
    });
    return Array.from(mappedIngredient.values());
  }

  /**
   * Método para convertir el resultado de la consulta a un array de pasos
   * @param result - resultado de la consulta
   * @returns array de pasos
   */
  private resultToStep(result: GetRecipeDto[]): RecipeStepI[] {
    const mappedStep: Map<number, RecipeStepI> = new Map();
    result.forEach((record: GetRecipeDto) => {
      let step: RecipeStepI;
      if (mappedStep.has(record.stepID)) {
        step = mappedStep.get(record.stepID);
      } else {
        step = {
          recipeStepID: record.stepID,
          recipeStepName: record.stepName,
          recipeStepDescription: record.stepDescription,
          recipeStepOrder: record.stepOrder,
          recipeStepIsOptional: record.stepIsOptional,
        };
        mappedStep.set(record.stepID, step);
      }
    });
    return Array.from(mappedStep.values());
  }

  /**
   * Método para convertir el resultado de la consulta a un array de nombres de recetas
   * @param result - resultado de la consulta
   * @returns array de nombres de recetas
   */
  private resultToRecipeName(result: GetRecipeDto[]): RecipeNameI[] {
    const mappedRecipe: Map<number, RecipeNameI> = new Map();
    result.forEach((record: GetRecipeDto) => {
      let recipe: RecipeNameI;
      if (mappedRecipe.has(record.recipeID)) {
        recipe = mappedRecipe.get(record.recipeID);
      } else {
        recipe = {
          recipeID: record.recipeID,
          recipeName: record.recipeName,
          tags: [],
        };
        mappedRecipe.set(record.recipeID, recipe);
      }

      if (
        record.tagID &&
        !recipe.tags.some((tag) => tag.tagID === record.tagID)
      ) {
        recipe.tags.push({
          tagID: record.tagID,
          tagName: record.tagName,
          tagType: record.tagType,
        });
      }
    });

    return Array.from(mappedRecipe.values());
  }

  /**
   * Método para añadir los criterios de búsqueda a los filtros
   * @param filters - filtros
   * @param search - criterios de búsqueda
   * @returns filtros con criterios de búsqueda
   */
  private addSearchToFilters(filters: string, search: string): string {
    if (search) {
      filters += ` 
        AND (recipeTitle LIKE '%${search}%')
        `;
    }
    return filters;
  }
}
