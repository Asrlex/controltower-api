import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString } from 'class-validator';

export class CreateTagDto {
  @ApiProperty({
    description: 'The name of the tag',
    example: 'Dairy',
    nullable: false,
  })
  @IsString()
  tagName: string;
  @ApiProperty({
    description: 'The type of the tag',
    example: 'Product',
    nullable: false,
  })
  @IsString()
  tagType: string;
}

export class GetTagDto {
  @IsNumber()
  tagID: number;
  @IsString()
  tagName: string;
  @IsString()
  tagType: string;
}

export class CreateItemTagDto {
  @ApiProperty({
    description: 'The ID of the tag',
    example: 1,
    nullable: false,
  })
  @IsNumber()
  tagID: number;
  @ApiProperty({
    description: 'The ID of the item',
    example: 1,
    nullable: false,
  })
  @IsNumber()
  itemID: number;
}
