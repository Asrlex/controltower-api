import { Module, Logger, forwardRef } from '@nestjs/common';
import { DatabaseModule } from '@/db/database.module';
import { ShoppingListProductController } from './shopping-list.controller';
import { ShoppingListProductService } from './shopping-list.service';
import { StockProductModule } from '../stock/stock.module';
import { AuthModule } from '@/api/auth/auth.module';
import { StockProductRepositoryImplementation } from '../stock/repository/stock.repository';
import { STOCK_PRODUCT_REPOSITORY } from '../stock/repository/stock.repository.interface';
import { ShoppingListProductRepositoryImplementation } from './repository/shopping-list.repository';
import { SHOPPING_LIST_PRODUCT_REPOSITORY } from './repository/shopping-list.repository.interface';

@Module({
  imports: [DatabaseModule, forwardRef(() => StockProductModule), AuthModule],
  controllers: [ShoppingListProductController],
  providers: [
    {
      provide: STOCK_PRODUCT_REPOSITORY,
      useClass: StockProductRepositoryImplementation,
    },
    {
      provide: SHOPPING_LIST_PRODUCT_REPOSITORY,
      useClass: ShoppingListProductRepositoryImplementation,
    },
    ShoppingListProductService,
    Logger,
  ],
})
export class ShoppingListProductModule {}
