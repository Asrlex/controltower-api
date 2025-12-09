import { IsNumber, IsString } from 'class-validator';

export class CreateShopDto {
  @IsString()
  shopName: string;
}

export class GetShopDto {
  @IsNumber()
  shopID: number;
  @IsString()
  shopName: string;
}
