import {
  CreateIngredientDto,
  CreateRecipeDto,
  CreateStepDto,
} from '@/api/home-management/entities/dtos/recipe.dto';
import { SuccessCodes } from '@/api/entities/enums/response-codes.enum';
import { SearchCriteriaI } from '@/api/entities/interfaces/api.entity';
import {
  RecipeDetailI,
  RecipeIngredientI,
  RecipeNameI,
  RecipeStepI,
} from '@/api/home-management/entities/interfaces/home-management.entity';
import { Inject, Injectable } from '@nestjs/common';
import {
  RECIPE_REPOSITORY,
  RecipeRepository,
} from './repository/recipes.repository.interface';

@Injectable()
export class RecipeService {
  constructor(
    @Inject(RECIPE_REPOSITORY)
    private readonly recipeRepository: RecipeRepository,
  ) {}

  /**
   * Método para verificar si el endpoint de recetas esta funcionando
   * @returns string - mensaje indicando que el endpoint de recetas esta funcionando
   */
  async status() {
    return {
      statusCode: SuccessCodes.Ok,
      message: 'Recipe endpoint is working',
    };
  }

  /**
   * Método para obtener todos los recetas
   * @returns string - todos los recetas
   */
  async findAllRecipes(): Promise<{
    entities: RecipeDetailI[];
    total: number;
  }> {
    return await this.recipeRepository.findAll();
  }

  /**
   * Método para obtener todos los nombres de las recetas
   * @returns string - todos los nombres de las recetas
   */
  async findAllRecipeNames(): Promise<RecipeNameI[]> {
    return await this.recipeRepository.findAllNames();
  }

  /**
   * Método para obtener lista de recetas filtrados
   * @returns string - lista de recetas filtrados
   */
  async getRecipes(
    page: number,
    limit: number,
    searchCriteria: SearchCriteriaI,
  ): Promise<{
    entities: RecipeDetailI[];
    total: number;
  }> {
    return await this.recipeRepository.find(page, limit, searchCriteria);
  }

  /**
   * Método para obtener un receta por su id
   * @param id - id del receta
   * @returns string
   */
  async getRecipeById(id: string): Promise<RecipeDetailI> {
    return await this.recipeRepository.findById(id);
  }

  /**
   * Método para obtener un ingrediente por su id
   * @param ingredientID - id del ingrediente
   * @returns string
   */
  async getIngredientByID(ingredientID: string): Promise<RecipeIngredientI> {
    return await this.recipeRepository.findIngredientByID(ingredientID);
  }

  /**
   * Método para obtener un paso por su id
   * @param stepID - id del paso
   * @returns string
   */
  async getStepByID(stepID: string): Promise<RecipeStepI> {
    return await this.recipeRepository.findStepByID(stepID);
  }

  /**
   * Metodo para crear una nueva receta
   * @returns string - receta creada
   */
  async createRecipe(dto: CreateRecipeDto): Promise<RecipeDetailI> {
    return await this.recipeRepository.create(dto);
  }

  /**
   * Método para añadir un ingrediente a una receta
   * @param dto - DTO del ingrediente
   * @returns string - ingrediente añadido
   */
  async createIngredient(dto: CreateIngredientDto): Promise<RecipeIngredientI> {
    return await this.recipeRepository.createIngredient(dto);
  }

  /**
   * Método para añadir un paso a una receta
   * @param dto - DTO del paso
   * @returns string - paso añadido
   */
  async createStep(dto: CreateStepDto): Promise<RecipeStepI> {
    return await this.recipeRepository.createStep(dto);
  }

  /**
   * Método para actualizar una receta
   * @param id - id de la receta
   * @param customer - receta
   * @returns string - receta actualizada
   */
  async updateRecipe(id: string, customer: CreateRecipeDto) {
    return await this.recipeRepository.modify(id, customer);
  }

  /**
   * Método para eliminar una receta
   * @param id - id de la receta
   * @returns null - receta eliminada
   */
  async deleteRecipe(id: string) {
    await this.recipeRepository.delete(id);
  }

  /**
   * Método para eliminar un ingrediente
   * @param ingredientID - id del ingrediente
   * @returns null - ingrediente eliminado
   */
  async deleteIngredient(ingredientID: string) {
    await this.recipeRepository.deleteIngredient(ingredientID);
  }

  /**
   * Método para eliminar un paso
   * @param stepID - id del paso
   * @returns null - paso eliminado
   */
  async deleteStep(stepID: string) {
    await this.recipeRepository.deleteStep(stepID);
  }
}
