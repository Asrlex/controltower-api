import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString } from 'class-validator';

export class GetUserDto {
  @IsNumber()
  userID: number;
  @IsString()
  userName: string;
  @IsString()
  userEmail: string;
  @IsString()
  userPassword: string;
  @IsString()
  userDateCreated: string;
  @IsString()
  userDateModified: string;
  @IsString()
  userDateLastLogin: string;
}

export class CreateUserDto {
  @ApiProperty({
    description: 'The email of the user',
    example: 'example@example.com',
    nullable: false,
  })
  @IsString()
  email: string;
  @ApiProperty({
    description: 'The password of the user',
    example: 'password123',
    nullable: false,
  })
  @IsString()
  password: string;
}
