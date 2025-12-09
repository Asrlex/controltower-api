import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString } from 'class-validator';

export class CreateStockProductDto {
  @ApiProperty({
    description: 'The ID of the stock product',
    example: 1,
    nullable: false,
  })
  @IsNumber()
  stockProductID: number;
  @ApiProperty({
    description: 'The amount of the stock product',
    example: 10,
    nullable: false,
  })
  @IsNumber()
  stockProductAmount: number;
}

export class GetStockProductDto {
  @IsNumber()
  stockProductID: number;
  @IsNumber()
  stockProductAmount: number;
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
