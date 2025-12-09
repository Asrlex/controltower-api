import { GenericRepository } from '@/common/repository/generic-repository.interface';
import {
  RecipeDetailI,
  RecipeIngredientI,
  RecipeNameI,
  RecipeStepI,
} from '@/api/home-management/entities/interfaces/home-management.entity';
import {
  CreateIngredientDto,
  CreateRecipeDto,
  CreateStepDto,
} from '@/api/entities/dtos/home-management/recipe.dto';

export const RECIPE_REPOSITORY = 'RECIPE_REPOSITORY';

export interface RecipeRepository extends GenericRepository<
  RecipeDetailI,
  string,
  CreateRecipeDto
> {
  findIngredientByID(ingredientID: string): Promise<RecipeIngredientI>;
  findStepByID(stepID: string): Promise<RecipeStepI>;
  createIngredient(ingredient: CreateIngredientDto): Promise<RecipeIngredientI>;
  createStep(step: CreateStepDto): Promise<RecipeStepI>;
  modifyIngredients(
    ingredient: CreateIngredientDto[],
    original: RecipeDetailI,
  ): Promise<void>;
  modifySteps(step: CreateStepDto[], original: RecipeDetailI): Promise<void>;
  deleteIngredient(ingredientID: string): Promise<void>;
  deleteStep(stepID: string): Promise<void>;
  findAllNames(): Promise<RecipeNameI[]>;
}
