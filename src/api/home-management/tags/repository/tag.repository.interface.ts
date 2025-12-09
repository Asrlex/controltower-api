import { GenericRepository } from '@/common/repository/generic-repository.interface';
import { TagI } from '@/api/home-management/entities/interfaces/home-management.entity';
import { CreateTagDto } from '@/api/entities/dtos/home-management/tag.dto';

export const TAG_REPOSITORY = 'TAG_REPOSITORY';

export interface TagRepository extends GenericRepository<
  TagI,
  string,
  CreateTagDto
> {
  createItemTag(tagID: string, itemID: string): Promise<void>;
  deleteItemTag(tagID: string, itemID: string): Promise<void>;
}
