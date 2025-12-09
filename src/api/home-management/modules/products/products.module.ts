import { Module, Logger } from '@nestjs/common';
import { DatabaseModule } from '@/db/database.module';
import { ProductController } from './products.controller';
import { ProductService } from './products.service';
import { AuthModule } from '@/api/auth/auth.module';
import { ProductRepositoryImplementation } from './repository/products.repository';
import { PRODUCT_REPOSITORY } from './repository/products.repository.interface';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [ProductController],
  providers: [
    {
      provide: PRODUCT_REPOSITORY,
      useClass: ProductRepositoryImplementation,
    },
    ProductService,
    Logger,
  ],
})
export class ProductModule {}
