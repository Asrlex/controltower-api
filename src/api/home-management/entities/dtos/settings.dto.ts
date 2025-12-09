import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString } from 'class-validator';

export class GetSettingsDto {
  @IsNumber()
  settingsID: number;
  @IsString()
  settings: string;
  @IsNumber()
  settingsUserID: number;
  @IsString()
  settingsDateCreated: string;
  @IsString()
  settingsLastModified: string;
}

export class CreateSettingsDto {
  @ApiProperty({
    description: 'Settings',
    example: '{"theme":"dark","language":"en"}',
    nullable: false,
  })
  @IsString()
  settings: string;
  @ApiProperty({
    description: 'Settings User ID',
    example: 1,
    nullable: false,
  })
  @IsNumber()
  settingsUserID: number;
}
