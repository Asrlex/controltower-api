import { GenericRepository } from '@/common/repository/generic-repository.interface';
import {
  ShoppingListProductI,
  StockProductI,
} from '@/api/home-management/entities/interfaces/home-management.entity';
import { CreateStockProductDto } from '@/api/home-management/entities/dtos/stock-product.dto';

export const STOCK_PRODUCT_REPOSITORY = 'STOCK_PRODUCT_REPOSITORY';

export interface StockProductRepository extends GenericRepository<
  StockProductI,
  string,
  CreateStockProductDto
> {
  addProductToShoppingList(productId: string): Promise<ShoppingListProductI>;
  modifyAmount(productId: string, amount: number): Promise<void>;
}
