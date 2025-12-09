import { Module, Logger } from '@nestjs/common';
import { DatabaseModule } from '@/db/database.module';
import { TagController } from './tags.controller';
import { TagService } from './tags.service';
import { AuthModule } from '@/api/auth/auth.module';
import { TagRepositoryImplementation } from './repository/tag.repository';
import { TAG_REPOSITORY } from './repository/tag.repository.interface';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [TagController],
  providers: [
    {
      provide: TAG_REPOSITORY,
      useClass: TagRepositoryImplementation,
    },
    TagService,
    Logger,
  ],
})
export class TagModule {}
