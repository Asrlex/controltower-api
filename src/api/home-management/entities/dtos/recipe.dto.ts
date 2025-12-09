import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';

export class GetRecipeDto {
  @IsNumber()
  recipeID: number;
  @IsString()
  recipeName: string;
  @IsString()
  recipeDescription: string;
  @IsNumber()
  ingredientID: number;
  @IsNumber()
  ingredientAmount: number;
  @IsString()
  ingredientUnit: string;
  @IsBoolean()
  ingredientIsOptional: boolean;
  @IsNumber()
  productID: number;
  @IsString()
  productName: string;
  @IsNumber()
  stepID: number;
  @IsString()
  stepName: string;
  @IsString()
  stepDescription: string;
  @IsNumber()
  stepOrder: number;
  @IsBoolean()
  stepIsOptional: boolean;
  @IsNumber()
  tagID: number;
  @IsString()
  tagName: string;
  @IsString()
  tagType: string;
}

export class CreateIngredientDto {
  @IsNumber()
  @IsOptional()
  recipeIngredientID: number;
  @IsNumber()
  recipeID: number;
  @IsObject()
  product: {
    productID: number;
    productName: string;
  };
  @IsNumber()
  recipeIngredientAmount: number;
  @IsString()
  recipeIngredientUnit: string;
  @IsBoolean()
  recipeIngredientIsOptional: boolean;
}

export class CreateStepDto {
  @IsNumber()
  @IsOptional()
  recipeStepID: number;
  @IsNumber()
  recipeID: number;
  @IsString()
  recipeStepName: string;
  @IsString()
  recipeStepDescription: string;
  @IsNumber()
  recipeStepOrder: number;
  @IsBoolean()
  recipeStepIsOptional: boolean;
}

export class CreateRecipeDto {
  @ApiProperty({
    description: 'The ID of the recipe',
    example: 1,
    nullable: true,
  })
  @IsNumber()
  @IsOptional()
  recipeID: number;
  @ApiProperty({
    description: 'The name of the recipe',
    example: 'Pasta',
    nullable: false,
  })
  @IsString()
  recipeName: string;
  @ApiProperty({
    description: 'The description of the recipe',
    example: 'A delicious pasta recipe',
    nullable: false,
  })
  @IsString()
  recipeDescription: string;

  @ApiProperty({
    description: 'List of steps for the recipe',
    type: [CreateStepDto],
    isArray: true,
    example: 1,
    nullable: true,
  })
  @IsOptional()
  @IsArray()
  steps: CreateStepDto[];

  @ApiProperty({
    description: 'List of ingredients for the recipe',
    type: [CreateIngredientDto],
    isArray: true,
    example: 1,
    nullable: true,
  })
  @IsOptional()
  @IsArray()
  ingredients: CreateIngredientDto[];
}
