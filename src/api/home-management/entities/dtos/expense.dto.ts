import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString } from 'class-validator';

export class GetExpenseDto {
  @IsNumber()
  expenseID: number;
  @IsString()
  expenseTitle: string;
  @IsString()
  expenseDescription: string;
  @IsNumber()
  expenseAmount: number;
  @IsString()
  expenseDate: string;
  @IsNumber()
  categoryID: number;
  @IsString()
  categoryName: string;
}

export class CreateExpenseDto {
  @ApiProperty({
    description: 'The title of the expense',
    example: 'Groceries',
    nullable: false,
  })
  @IsString()
  expenseTitle: string;
  @ApiProperty({
    description: 'The description of the expense',
    example: 'Weekly groceries shopping',
    nullable: false,
  })
  @IsString()
  expenseDescription: string;
  @ApiProperty({
    description: 'The amount of the expense',
    example: 50.0,
    nullable: false,
  })
  @IsNumber()
  expenseAmount: number;
  @ApiProperty({
    description: 'The date of the expense',
    example: '2023-10-01',
    nullable: false,
  })
  @IsString()
  expenseDate: string;
  @ApiProperty({
    description: 'The ID of the category',
    example: 1,
    nullable: false,
  })
  @IsNumber()
  categoryID: number;
}
