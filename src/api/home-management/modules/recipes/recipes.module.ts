import { Module, Logger } from '@nestjs/common';
import { DatabaseModule } from '@/db/database.module';
import { RecipeController } from './recipes.controller';
import { RecipeService } from './recipes.service';
import { AuthModule } from '@/api/auth/auth.module';
import { RecipeRepositoryImplementation } from './repository/recipes.repository';
import { RECIPE_REPOSITORY } from './repository/recipes.repository.interface';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [RecipeController],
  providers: [
    {
      provide: RECIPE_REPOSITORY,
      useClass: RecipeRepositoryImplementation,
    },
    RecipeService,
    Logger,
  ],
})
export class RecipeModule {}
