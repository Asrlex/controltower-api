import { GenericRepository } from '@/common/repository/generic-repository.interface';
import { CreateShoppingListProductDto } from '@/api/home-management/entities/dtos/shopping-list.dto';
import {
  ShoppingListProductI,
  StockProductI,
} from '@/api/home-management/entities/interfaces/home-management.entity';

export const SHOPPING_LIST_PRODUCT_REPOSITORY =
  'SHOPPING_LIST_PRODUCT_REPOSITORY';

export interface ShoppingListProductRepository extends GenericRepository<
  ShoppingListProductI,
  string,
  CreateShoppingListProductDto
> {
  buyProduct(productId: string): Promise<StockProductI>;
  modifyAmount(productId: string, amount: number): Promise<void>;
}
