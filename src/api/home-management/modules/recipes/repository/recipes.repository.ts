import { Inject, Logger, NotFoundException } from '@nestjs/common';
import {
  and,
  asc,
  between,
  count,
  desc,
  eq,
  gt,
  gte,
  inArray,
  like,
  lt,
  lte,
  SQL,
} from 'drizzle-orm';
import { SearchCriteriaI, SortI } from 'src/api/entities/interfaces/api.entity';
import { plainToInstance } from 'class-transformer';
import {
  CreateIngredientDto,
  CreateRecipeDto,
  CreateStepDto,
} from '@/api/home-management/entities/dtos/recipe.dto';
import {
  RecipeDetailI,
  RecipeIngredientI,
  RecipeNameI,
  RecipeStepI,
} from '@/api/home-management/entities/interfaces/home-management.entity';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { RecipeRepository } from './recipes.repository.interface';
import { DRIZZLE_DB } from '@/db/drizzle/drizzle.constants';
import { HomeManagementDrizzleDb } from '@/db/drizzle/drizzle.client';
import {
  products,
  recipeIngredients,
  recipes,
  recipeSteps,
  recipeTags,
  tags,
} from '@/db/schema';
import { saveLogWithDb } from '@/common/utils/repository.utils';

export class RecipeRepositoryImplementation implements RecipeRepository {
  constructor(
    @Inject(DRIZZLE_DB)
    private readonly db: HomeManagementDrizzleDb,
    private readonly logger: Logger,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

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
    const entities = await this.fetchRecipeDetails();
    const [{ total }] = await this.db
      .select({ total: count(recipes.id) })
      .from(recipes);
    if (this.cacheManager) {
      await this.cacheManager.set(cacheKey, {
        entities,
        total: Number(total),
      });
    }
    return {
      entities,
      total: Number(total),
    };
  }

  /**
   * Método para obtener todos los nombres de las recetas
   * @returns string - todos los nombres de las recetas
   */
  async findAllNames(): Promise<RecipeNameI[]> {
    const rows = await this.fetchRecipeBaseRows();
    return this.resultToRecipeName(rows);
  }

  /**
   * Método para obtener lista de recetas filtradas
   * @returns string - lista de recetas filtradas
   */
  async find(
    page: number,
    limit: number,
    searchCriteria: SearchCriteriaI,
  ): Promise<{ entities: RecipeDetailI[]; total: number }> {
    const whereClause = this.buildWhereClause(searchCriteria);
    const orderBy = this.resolveSort(searchCriteria?.sort?.[0]);
    const offset = page * limit;
    const idsQuery = this.db.select({ id: recipes.id }).from(recipes);
    const scopedIdsQuery = whereClause ? idsQuery.where(whereClause) : idsQuery;
    const paginatedRecipes = await scopedIdsQuery
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset);
    const recipeIds = paginatedRecipes.map((recipe) => recipe.id);
    const entities = recipeIds.length > 0 ? await this.fetchRecipeDetails(recipeIds, orderBy) : [];
    const totalQuery = this.db.select({ total: count(recipes.id) }).from(recipes);
    const [{ total }] = whereClause
      ? await totalQuery.where(whereClause)
      : await totalQuery;
    return {
      entities,
      total: Number(total),
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
    const entities = await this.fetchRecipeDetails([Number(id)]);
    const recipe = entities.length > 0 ? entities[0] : null;
    if (recipe && this.cacheManager) {
      await this.cacheManager.set(cacheKey, recipe);
    }
    return recipe;
  }

  /**
   * Método para obtener un ingrediente por su id
   * @param ingredientID - id del ingrediente
   * @returns string
   */
  async findIngredientByID(ingredientID: string): Promise<RecipeIngredientI> {
    const result = await this.db
      .select({
        recipeIngredientID: recipeIngredients.id,
        recipeID: recipeIngredients.recipeId,
        recipeIngredientAmount: recipeIngredients.amount,
        recipeIngredientUnit: recipeIngredients.unit,
        recipeIngredientIsOptional: recipeIngredients.optional,
        productID: products.id,
        productName: products.name,
      })
      .from(recipeIngredients)
      .innerJoin(products, eq(products.id, recipeIngredients.productId))
      .where(eq(recipeIngredients.id, Number(ingredientID)))
      .limit(1);
    return result[0] ? this.resultToIngredient(result)[0] : null;
  }

  /**
   * Método para obtener un paso por su id
   * @param stepID - id del paso
   * @returns string
   */
  async findStepByID(stepID: string): Promise<RecipeStepI> {
    const result = await this.db
      .select({
        recipeStepID: recipeSteps.id,
        recipeID: recipeSteps.recipeId,
        recipeStepName: recipeSteps.name,
        recipeStepDescription: recipeSteps.description,
        recipeStepOrder: recipeSteps.stepOrder,
        recipeStepIsOptional: recipeSteps.optional,
      })
      .from(recipeSteps)
      .where(eq(recipeSteps.id, Number(stepID)))
      .limit(1);
    return result[0] ? this.resultToStep(result)[0] : null;
  }

  /**
   * Metodo para crear una nueva receta
   * @returns string - receta creada
   */
  async create(dto: CreateRecipeDto): Promise<RecipeDetailI> {
    dto = this.prepareDTO(dto);
    const response = await this.db
      .insert(recipes)
      .values({
        name: dto.recipeName,
        description: dto.recipeDescription,
      })
      .returning({ id: recipes.id });
    const recipeID = response[0].id;

    const ingredients = dto.ingredients ?? [];
    for (const ingredient of ingredients) {
      ingredient.recipeID = recipeID;
      await this.createIngredient(ingredient);
    }

    const steps = dto.steps ?? [];
    for (const step of steps) {
      step.recipeID = recipeID;
      await this.createStep(step);
    }

    const newRecipe: RecipeDetailI = await this.findById(String(recipeID));

    const cachedRecipes: { entities: RecipeDetailI[]; total: number } =
      await this.cacheManager.get('recipes');
    if (cachedRecipes) {
      cachedRecipes.entities.push(newRecipe);
      cachedRecipes.total += 1;
      await this.cacheManager.set('recipes', cachedRecipes);
    }

    if (this.cacheManager) {
      await this.cacheManager.set(`recipe-${recipeID}`, newRecipe);
    }

    await saveLogWithDb(this.db, 'recipe', `Created recipe ${recipeID}`);
    return newRecipe;
  }

  /**
   * Método para añadir un ingrediente a una receta
   * @param dto - DTO del ingrediente
   * @returns string - ingrediente añadido
   */
  async createIngredient(dto: CreateIngredientDto): Promise<RecipeIngredientI> {
    const response = await this.db
      .insert(recipeIngredients)
      .values({
        recipeId: dto.recipeID,
        productId: dto.product.productID,
        amount: dto.recipeIngredientAmount,
        unit: dto.recipeIngredientUnit,
        optional: dto.recipeIngredientIsOptional ?? false,
      })
      .returning({ id: recipeIngredients.id });
    const ingredientID = response[0].id;
    await saveLogWithDb(this.db, 'ingredient', `Created ingredient ${ingredientID}`);
    return this.findIngredientByID(String(ingredientID));
  }

  /**
   * Método para añadir un paso a una receta
   * @param dto - DTO del paso
   * @returns string - paso añadido
   */
  async createStep(dto: CreateStepDto): Promise<RecipeStepI> {
    const response = await this.db
      .insert(recipeSteps)
      .values({
        recipeId: dto.recipeID,
        name: dto.recipeStepName,
        description: dto.recipeStepDescription,
        stepOrder: dto.recipeStepOrder,
        optional: dto.recipeStepIsOptional ?? false,
      })
      .returning({ id: recipeSteps.id });
    const stepID = response[0].id;

    await saveLogWithDb(this.db, 'step', `Created step ${stepID}`);
    return this.findStepByID(String(stepID));
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

    await this.db
      .update(recipes)
      .set({
        name: dto.recipeName,
        description: dto.recipeDescription,
      })
      .where(eq(recipes.id, Number(id)));

    const ingredients = dto.ingredients ?? [];
    ingredients.forEach((ingredient) => {
      ingredient.recipeID = Number(id);
    });
    await this.modifyIngredients(ingredients, originalRecipe);

    const steps = dto.steps ?? [];
    steps.forEach((step) => {
      step.recipeID = Number(id);
    });
    await this.modifySteps(steps, originalRecipe);

    if (this.cacheManager) {
      await this.cacheManager.del(`recipe-${id}`);
    }

    const editedRecipe: RecipeDetailI = await this.findById(id);

    const cachedRecipes: {
      entities: RecipeDetailI[];
      total: number;
    } = await this.cacheManager.get('recipes');
    if (cachedRecipes) {
      const index = cachedRecipes.entities.findIndex(
        (r: RecipeDetailI) => r.recipeID.toString() === id,
      );
      if (index !== -1) {
        cachedRecipes.entities[index] = editedRecipe;
        await this.cacheManager.set('recipes', cachedRecipes);
      }
    }

    if (this.cacheManager) {
      await this.cacheManager.set(`recipe-${id}`, editedRecipe);
    }

    await saveLogWithDb(this.db, 'recipe', `Modified recipe ${id}`);
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
    for (const ingredient of ingredientsToDelete) {
      await this.deleteIngredient(ingredient.toString());
    }

    for (const ingredient of dto) {
      if (!ingredient.recipeIngredientID) {
        await this.createIngredient(ingredient);
      } else {
        await this.db
          .update(recipeIngredients)
          .set({
            productId: ingredient.product.productID,
            amount: ingredient.recipeIngredientAmount,
            unit: ingredient.recipeIngredientUnit,
            optional: ingredient.recipeIngredientIsOptional ?? false,
          })
          .where(eq(recipeIngredients.id, ingredient.recipeIngredientID));
      }
    }
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
    for (const step of stepsToDelete) {
      await this.deleteStep(step.toString());
    }

    for (const step of dto) {
      if (!step.recipeStepID) {
        await this.createStep(step);
      } else {
        await this.db
          .update(recipeSteps)
          .set({
            name: step.recipeStepName,
            description: step.recipeStepDescription,
            stepOrder: step.recipeStepOrder,
            optional: step.recipeStepIsOptional ?? false,
          })
          .where(eq(recipeSteps.id, step.recipeStepID));
      }
    }
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

    await this.db.delete(recipeTags).where(eq(recipeTags.recipeId, Number(id)));
    await this.db.delete(recipeIngredients).where(eq(recipeIngredients.recipeId, Number(id)));
    await this.db.delete(recipeSteps).where(eq(recipeSteps.recipeId, Number(id)));
    await this.db.delete(recipes).where(eq(recipes.id, Number(id)));

    const cachedRecipes: {
      entities: RecipeDetailI[];
      total: number;
    } = await this.cacheManager.get('recipes');
    if (cachedRecipes) {
      const index = cachedRecipes.entities.findIndex(
        (r: RecipeDetailI) => r.recipeID.toString() === id,
      );
      if (index !== -1) {
        cachedRecipes.entities.splice(index, 1);
        cachedRecipes.total = Math.max(0, cachedRecipes.total - 1);
        await this.cacheManager.set('recipes', cachedRecipes);
      }
    }

    if (this.cacheManager) {
      await this.cacheManager.del(`recipe-${id}`);
    }

    await saveLogWithDb(this.db, 'recipe', `Deleted recipe ${id}`);
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
    await this.db
      .delete(recipeIngredients)
      .where(eq(recipeIngredients.id, Number(ingredientID)));

    await saveLogWithDb(this.db, 'ingredient', `Deleted ingredient ${ingredientID}`);
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
    await this.db.delete(recipeSteps).where(eq(recipeSteps.id, Number(stepID)));
    await saveLogWithDb(this.db, 'step', `Deleted step ${stepID}`);
  }

  /**
   * Método para inicializar valores opcionales del DTO
   * @param dto - DTO
   * @returns DTO
   */
  private prepareDTO(dto: CreateRecipeDto): CreateRecipeDto {
    return plainToInstance(CreateRecipeDto, dto, {
      exposeDefaultValues: true,
    });
  }

  /**
   * Método para convertir el resultado de la consulta a un array de recetas
   * @param result - resultado de la consulta
   * @returns array de recetas
   */
  private resultToRecipe(
    recipeRows: RecipeBaseRow[],
    ingredientRows: RecipeIngredientRow[],
    stepRows: RecipeStepRow[],
  ): RecipeDetailI[] {
    const mappedRecipe: Map<number, RecipeDetailI> = new Map();
    recipeRows.forEach((record) => {
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
    });

    const ingredientMap = this.groupIngredientsByRecipe(ingredientRows);
    const stepMap = this.groupStepsByRecipe(stepRows);

    mappedRecipe.forEach((recipe) => {
      recipe.ingredients = ingredientMap.get(recipe.recipeID) ?? [];
      recipe.steps = stepMap.get(recipe.recipeID) ?? [];
    });
    return Array.from(mappedRecipe.values());
  }

  /**
   * Método para convertir el resultado de la consulta a un array de ingredientes
   * @param result - resultado de la consulta
   * @returns array de ingredientes
   */
  private resultToIngredient(result: RecipeIngredientRow[]): RecipeIngredientI[] {
    const mappedIngredient: Map<number, RecipeIngredientI> = new Map();
    result.forEach((record) => {
      let ingredient: RecipeIngredientI;
      if (mappedIngredient.has(record.recipeIngredientID)) {
        ingredient = mappedIngredient.get(record.recipeIngredientID);
      } else {
        ingredient = {
          recipeIngredientID: record.recipeIngredientID,
          recipeIngredientAmount: record.recipeIngredientAmount,
          recipeIngredientUnit: record.recipeIngredientUnit,
          recipeIngredientIsOptional: record.recipeIngredientIsOptional,
          product: {
            productID: record.productID,
            productName: record.productName,
            productUnit: null,
            productDateLastConsumed: null,
            productDateLastBought: null,
            tags: [],
          },
        };
        mappedIngredient.set(record.recipeIngredientID, ingredient);
      }
    });
    return Array.from(mappedIngredient.values());
  }

  /**
   * Método para convertir el resultado de la consulta a un array de pasos
   * @param result - resultado de la consulta
   * @returns array de pasos
   */
  private resultToStep(result: RecipeStepRow[]): RecipeStepI[] {
    const mappedStep: Map<number, RecipeStepI> = new Map();
    result.forEach((record) => {
      let step: RecipeStepI;
      if (mappedStep.has(record.recipeStepID)) {
        step = mappedStep.get(record.recipeStepID);
      } else {
        step = {
          recipeStepID: record.recipeStepID,
          recipeStepName: record.recipeStepName,
          recipeStepDescription: record.recipeStepDescription,
          recipeStepOrder: record.recipeStepOrder,
          recipeStepIsOptional: record.recipeStepIsOptional,
        };
        mappedStep.set(record.recipeStepID, step);
      }
    });
    return Array.from(mappedStep.values());
  }

  /**
   * Método para convertir el resultado de la consulta a un array de nombres de recetas
   * @param result - resultado de la consulta
   * @returns array de nombres de recetas
   */
  private resultToRecipeName(result: RecipeBaseRow[]): RecipeNameI[] {
    const mappedRecipe: Map<number, RecipeNameI> = new Map();
    result.forEach((record) => {
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

  private groupIngredientsByRecipe(
    rows: RecipeIngredientRow[],
  ): Map<number, RecipeIngredientI[]> {
    const grouped = new Map<number, RecipeIngredientI[]>();
    rows.forEach((row) => {
      const ingredient = this.resultToIngredient([row])[0];
      if (!grouped.has(row.recipeID)) {
        grouped.set(row.recipeID, []);
      }
      grouped.get(row.recipeID).push(ingredient);
    });
    return grouped;
  }

  private groupStepsByRecipe(rows: RecipeStepRow[]): Map<number, RecipeStepI[]> {
    const grouped = new Map<number, RecipeStepI[]>();
    rows.forEach((row) => {
      const step = this.resultToStep([row])[0];
      if (!grouped.has(row.recipeID)) {
        grouped.set(row.recipeID, []);
      }
      grouped.get(row.recipeID).push(step);
    });
    return grouped;
  }

  private async fetchRecipeDetails(
    recipeIds?: number[],
    orderBy?: SQL,
  ): Promise<RecipeDetailI[]> {
    const recipeRows = await this.fetchRecipeBaseRows(recipeIds, orderBy);
    const ids = recipeIds ?? Array.from(new Set(recipeRows.map((row) => row.recipeID)));
    const ingredientRows = ids.length > 0 ? await this.fetchRecipeIngredientRowsByRecipeIds(ids) : [];
    const stepRows = ids.length > 0 ? await this.fetchRecipeStepRowsByRecipeIds(ids) : [];
    return this.resultToRecipe(recipeRows, ingredientRows, stepRows);
  }

  private async fetchRecipeBaseRows(
    recipeIds?: number[],
    orderBy?: SQL,
  ): Promise<RecipeBaseRow[]> {
    const query = this.db
      .select({
        recipeID: recipes.id,
        recipeName: recipes.name,
        recipeDescription: recipes.description,
        tagID: tags.id,
        tagName: tags.name,
        tagType: tags.type,
      })
      .from(recipes)
      .leftJoin(recipeTags, eq(recipeTags.recipeId, recipes.id))
      .leftJoin(tags, eq(tags.id, recipeTags.tagId));

    const scopedQuery = recipeIds?.length ? query.where(inArray(recipes.id, recipeIds)) : query;
    return scopedQuery.orderBy(orderBy ?? desc(recipes.name));
  }

  private async fetchRecipeIngredientRowsByRecipeIds(
    recipeIds: number[],
  ): Promise<RecipeIngredientRow[]> {
    return this.db
      .select({
        recipeIngredientID: recipeIngredients.id,
        recipeID: recipeIngredients.recipeId,
        recipeIngredientAmount: recipeIngredients.amount,
        recipeIngredientUnit: recipeIngredients.unit,
        recipeIngredientIsOptional: recipeIngredients.optional,
        productID: products.id,
        productName: products.name,
      })
      .from(recipeIngredients)
      .innerJoin(products, eq(products.id, recipeIngredients.productId))
      .where(inArray(recipeIngredients.recipeId, recipeIds))
      .orderBy(asc(recipeIngredients.id));
  }

  private async fetchRecipeStepRowsByRecipeIds(
    recipeIds: number[],
  ): Promise<RecipeStepRow[]> {
    return this.db
      .select({
        recipeStepID: recipeSteps.id,
        recipeID: recipeSteps.recipeId,
        recipeStepName: recipeSteps.name,
        recipeStepDescription: recipeSteps.description,
        recipeStepOrder: recipeSteps.stepOrder,
        recipeStepIsOptional: recipeSteps.optional,
      })
      .from(recipeSteps)
      .where(inArray(recipeSteps.recipeId, recipeIds))
      .orderBy(asc(recipeSteps.stepOrder), asc(recipeSteps.id));
  }

  private resolveSort(sort?: SortI): SQL {
    const order = sort?.order?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    switch (sort?.field) {
      case 'recipeID':
        return order === 'ASC' ? asc(recipes.id) : desc(recipes.id);
      case 'recipeDescription':
        return order === 'ASC' ? asc(recipes.description) : desc(recipes.description);
      case 'recipeName':
      default:
        return order === 'ASC' ? asc(recipes.name) : desc(recipes.name);
    }
  }

  private buildWhereClause(searchCriteria?: SearchCriteriaI): SQL | undefined {
    const conditions: SQL[] = [];
    searchCriteria?.filters?.forEach((filter) => {
      const condition = this.buildFilterCondition(filter);
      if (condition) {
        conditions.push(condition);
      }
    });

    if (searchCriteria?.search) {
      conditions.push(like(recipes.name, `%${searchCriteria.search}%`));
    }

    return conditions.length > 0 ? and(...conditions) : undefined;
  }

  private buildFilterCondition(filter: {
    field?: string;
    operator?: string;
    value?: string;
  }): SQL | undefined {
    if (!filter?.field || !filter?.operator || filter.value === undefined) {
      return undefined;
    }

    const definition =
      filter.field === 'recipeID'
        ? { column: recipes.id, isNumeric: true }
        : filter.field === 'recipeName'
          ? { column: recipes.name, isNumeric: false }
          : filter.field === 'recipeDescription'
            ? { column: recipes.description, isNumeric: false }
            : null;

    if (!definition) {
      return undefined;
    }

    const operator = filter.operator.toLowerCase();
    const value = definition.isNumeric ? Number(filter.value) : filter.value;

    if (operator === '=') {
      return eq(definition.column, value as never);
    }
    if (operator === '>') {
      return gt(definition.column, value as never);
    }
    if (operator === '>=') {
      return gte(definition.column, value as never);
    }
    if (operator === '<') {
      return lt(definition.column, value as never);
    }
    if (operator === '<=') {
      return lte(definition.column, value as never);
    }
    if (operator === 'like' && !definition.isNumeric) {
      return like(definition.column, `%${filter.value}%`);
    }
    if (operator === 'between') {
      const [start, end] = filter.value.split(',');
      if (definition.isNumeric) {
        return between(definition.column, Number(start), Number(end));
      }
      return between(definition.column, start, end);
    }
    if (operator === 'in') {
      const items = filter.value
        .split(',')
        .map((entry) => entry.trim().replace(/^'+|'+$/g, ''));
      return definition.isNumeric
        ? inArray(definition.column, items.map((entry) => Number(entry)))
        : inArray(definition.column, items);
    }

    return undefined;
  }
}

interface RecipeBaseRow {
  recipeID: number;
  recipeName: string;
  recipeDescription: string;
  tagID: number | null;
  tagName: string | null;
  tagType: string | null;
}

interface RecipeIngredientRow {
  recipeIngredientID: number;
  recipeID: number;
  recipeIngredientAmount: number;
  recipeIngredientUnit: string;
  recipeIngredientIsOptional: boolean;
  productID: number;
  productName: string;
}

interface RecipeStepRow {
  recipeStepID: number;
  recipeID: number;
  recipeStepName: string;
  recipeStepDescription: string;
  recipeStepOrder: number;
  recipeStepIsOptional: boolean;
}
