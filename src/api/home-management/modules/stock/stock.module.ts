import { Module, Logger, forwardRef } from '@nestjs/common';
import { DatabaseModule } from '@/db/database.module';
import { StockProductService } from './stock.service';
import { StockProductController } from './stock.controller';
import { ShoppingListProductModule } from '../shopping-list/shopping-list.module';
import { AuthModule } from '@/api/auth/auth.module';
import { ShoppingListProductRepositoryImplementation } from '../shopping-list/repository/shopping-list.repository';
import { SHOPPING_LIST_PRODUCT_REPOSITORY } from '../shopping-list/repository/shopping-list.repository.interface';
import { StockProductRepositoryImplementation } from './repository/stock.repository';
import { STOCK_PRODUCT_REPOSITORY } from './repository/stock.repository.interface';

@Module({
  imports: [
    DatabaseModule,
    forwardRef(() => ShoppingListProductModule),
    AuthModule,
  ],
  controllers: [StockProductController],
  providers: [
    {
      provide: STOCK_PRODUCT_REPOSITORY,
      useClass: StockProductRepositoryImplementation,
    },
    {
      provide: SHOPPING_LIST_PRODUCT_REPOSITORY,
      useClass: ShoppingListProductRepositoryImplementation,
    },
    StockProductService,
    Logger,
  ],
  exports: [STOCK_PRODUCT_REPOSITORY],
})
export class StockProductModule {}
