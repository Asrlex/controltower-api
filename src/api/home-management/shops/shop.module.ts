import { Module, Logger } from '@nestjs/common';
import { DatabaseModule } from '@/db/database.module';
import { ShopController } from './shop.controller';
import { ShopService } from './shop.service';
import { AuthModule } from '@/api/auth/auth.module';
import { ShopRepositoryImplementation } from './repository/shop.repository';
import { SHOP_REPOSITORY } from './repository/shop.repository.interface';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [ShopController],
  providers: [
    {
      provide: SHOP_REPOSITORY,
      useClass: ShopRepositoryImplementation,
    },
    ShopService,
    Logger,
  ],
})
export class ShopModule {}
