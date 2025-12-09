import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumber } from 'class-validator';

export class CreateShoppingListProductDto {
  @ApiProperty({
    description: 'The ID of the shopping list product',
    example: 1,
    nullable: false,
  })
  @IsNumber()
  @IsNotEmpty()
  readonly shoppingListProductID: number;
  @ApiProperty({
    description: 'The amount of the shopping list product',
    example: 10,
    nullable: false,
  })
  @IsNumber()
  @IsNotEmpty()
  readonly shoppingListAmount: number;
  @ApiProperty({
    description: 'The ID of the shop',
    example: 2,
    nullable: false,
  })
  @IsNumber()
  shopID: number;
}

export class GetShoppingListProductDto {
  @IsNumber()
  @IsNotEmpty()
  shoppingListProductID: number;
  @IsNumber()
  shoppingListAmount: number;
  @IsNumber()
  productID: number;
  @IsString()
  productName: string;
  @IsString()
  productUnit: string;
  @IsString()
  productDateLastBought: string;
  @IsString()
  productDateLastConsumed: string;
  @IsNumber()
  shopID: number;
  @IsString()
  shopName: string;
  @IsNumber()
  tagID: number;
  @IsString()
  tagName: string;
  @IsString()
  tagType: string;
}
