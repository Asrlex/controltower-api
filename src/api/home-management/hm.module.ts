import { DatabaseModule } from '@/db/database.module';
import { forwardRef, Logger, Module } from '@nestjs/common';
import { ProductModule } from './products/products.module';
import { ShoppingListProductModule } from './shopping-list/shopping-list.module';
import { StockProductModule } from './stock/stock.module';
import { RouterModule } from '@nestjs/core';
import { ShopModule } from './shops/shop.module';
import { TaskModule } from './tasks/task.module';
import { TagModule } from './tags/tags.module';
import { RecipeModule } from './recipes/recipes.module';
import { SettingsModule } from './settings/settings.module';
import { ExpenseModule } from './expenses/expenses.module';
import { ProductRepositoryImplementation } from './products/repository/products.repository';
import { PRODUCT_REPOSITORY } from './products/repository/products.repository.interface';
import { RecipeRepositoryImplementation } from './recipes/repository/recipes.repository';
import { RECIPE_REPOSITORY } from './recipes/repository/recipes.repository.interface';
import { SettingsRepositoryImplementation } from './settings/repository/settings.repository';
import { SETTINGS_REPOSITORY } from './settings/repository/settings.repository.interface';
import { ShoppingListProductRepositoryImplementation } from './shopping-list/repository/shopping-list.repository';
import { SHOPPING_LIST_PRODUCT_REPOSITORY } from './shopping-list/repository/shopping-list.repository.interface';
import { StockProductRepositoryImplementation } from './stock/repository/stock.repository';
import { STOCK_PRODUCT_REPOSITORY } from './stock/repository/stock.repository.interface';
import { ShopRepositoryImplementation } from './shops/repository/shop.repository';
import { SHOP_REPOSITORY } from './shops/repository/shop.repository.interface';
import { TagRepositoryImplementation } from './tags/repository/tag.repository';
import { TAG_REPOSITORY } from './tags/repository/tag.repository.interface';
import { TaskRepositoryImplementation } from './tasks/repository/task.repository';
import { TASK_REPOSITORY } from './tasks/repository/task.repository.interface';
import { ShiftModule } from './shifts/shift.module';

@Module({
  imports: [
    DatabaseModule,
    ProductModule,
    forwardRef(() => StockProductModule),
    forwardRef(() => ShoppingListProductModule),
    ShopModule,
    TaskModule,
    TagModule,
    RecipeModule,
    SettingsModule,
    ExpenseModule,
    ShiftModule,
    RouterModule.register([
      {
        path: 'home-management',
        module: HmModule,
        children: [
          {
            path: 'products',
            module: ProductModule,
          },
          {
            path: 'stock-products',
            module: StockProductModule,
          },
          {
            path: 'shopping-list-products',
            module: ShoppingListProductModule,
          },
          {
            path: 'shops',
            module: ShopModule,
          },
          {
            path: 'tasks',
            module: TaskModule,
          },
          {
            path: 'tags',
            module: TagModule,
          },
          {
            path: 'recipes',
            module: RecipeModule,
          },
          {
            path: 'settings',
            module: SettingsModule,
          },
          {
            path: 'expenses',
            module: ExpenseModule,
          },
          {
            path: 'shifts',
            module: ShiftModule,
          },
        ],
      },
    ]),
  ],
  controllers: [],
  providers: [
    Logger,
    {
      provide: PRODUCT_REPOSITORY,
      useClass: ProductRepositoryImplementation,
    },
    {
      provide: STOCK_PRODUCT_REPOSITORY,
      useClass: StockProductRepositoryImplementation,
    },
    {
      provide: SHOPPING_LIST_PRODUCT_REPOSITORY,
      useClass: ShoppingListProductRepositoryImplementation,
    },
    {
      provide: SHOP_REPOSITORY,
      useClass: ShopRepositoryImplementation,
    },
    {
      provide: TASK_REPOSITORY,
      useClass: TaskRepositoryImplementation,
    },
    {
      provide: TAG_REPOSITORY,
      useClass: TagRepositoryImplementation,
    },
    {
      provide: RECIPE_REPOSITORY,
      useClass: RecipeRepositoryImplementation,
    },
    {
      provide: SETTINGS_REPOSITORY,
      useClass: SettingsRepositoryImplementation,
    },
  ],
})
export class HmModule {}
