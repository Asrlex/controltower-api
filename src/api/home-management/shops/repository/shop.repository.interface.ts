import { GenericRepository } from '@/common/repository/generic-repository.interface';
import { ShopI } from '@/api/home-management/entities/interfaces/home-management.entity';
import { CreateShopDto as CreateShopDto } from '@/api/home-management/entities/dtos/shop.dto';

export const SHOP_REPOSITORY = 'SHOP_REPOSITORY';

export interface IShopRepository extends GenericRepository<
  ShopI,
  string,
  CreateShopDto
> {}
