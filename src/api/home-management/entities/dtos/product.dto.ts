import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString } from 'class-validator';

export class CreateProductDto {
  @ApiProperty({
    description: 'The name of the product',
    example: 'Milk',
    nullable: false,
  })
  @IsString()
  productName: string;
  @ApiProperty({
    description: 'The unit of the product',
    example: 'liters',
    nullable: false,
  })
  @IsString()
  productUnit: string;
}

export class GetProductDto {
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
  tagID: number;
  @IsString()
  tagName: string;
  @IsString()
  tagType: string;
}
