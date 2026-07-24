import { DatabaseModule } from '@/db/database.module';
import { forwardRef, Logger, Module } from '@nestjs/common';
import { RouterModule } from '@nestjs/core';
import { ExpenseModule } from './modules/expenses/expenses.module';
import { ProductModule } from './modules/products/products.module';
import { ProductRepositoryImplementation } from './modules/products/repository/products.repository';
import { PRODUCT_REPOSITORY } from './modules/products/repository/products.repository.interface';
import { RecipeModule } from './modules/recipes/recipes.module';
import { RecipeRepositoryImplementation } from './modules/recipes/repository/recipes.repository';
import { RECIPE_REPOSITORY } from './modules/recipes/repository/recipes.repository.interface';
import { SettingsRepositoryImplementation } from './modules/settings/repository/settings.repository';
import { SETTINGS_REPOSITORY } from './modules/settings/repository/settings.repository.interface';
import { SettingsModule } from './modules/settings/settings.module';
import { ShiftModule } from './modules/shifts/shift.module';
import { ShoppingListProductRepositoryImplementation } from './modules/shopping-list/repository/shopping-list.repository';
import { SHOPPING_LIST_PRODUCT_REPOSITORY } from './modules/shopping-list/repository/shopping-list.repository.interface';
import { ShoppingListProductModule } from './modules/shopping-list/shopping-list.module';
import { ShopRepositoryImplementation } from './modules/shops/repository/shop.repository';
import { SHOP_REPOSITORY } from './modules/shops/repository/shop.repository.interface';
import { ShopModule } from './modules/shops/shop.module';
import { StockProductRepositoryImplementation } from './modules/stock/repository/stock.repository';
import { STOCK_PRODUCT_REPOSITORY } from './modules/stock/repository/stock.repository.interface';
import { StockProductModule } from './modules/stock/stock.module';
import { TagRepositoryImplementation } from './modules/tags/repository/tag.repository';
import { TAG_REPOSITORY } from './modules/tags/repository/tag.repository.interface';
import { TagModule } from './modules/tags/tags.module';
import { TaskRepositoryImplementation } from './modules/tasks/repository/task.repository';
import { TASK_REPOSITORY } from './modules/tasks/repository/task.repository.interface';
import { TaskModule } from './modules/tasks/task.module';

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
