import { Inject, Logger, NotFoundException } from '@nestjs/common';
import {
  and,
  asc,
  between,
  count,
  desc,
  eq,
  gt,
  gte,
  inArray,
  like,
  lt,
  lte,
  SQL,
} from 'drizzle-orm';
import { SearchCriteriaI, SortI } from 'src/api/entities/interfaces/api.entity';
import { plainToInstance } from 'class-transformer';
import { TagRepository } from './tag.repository.interface';
import { TagI } from '@/api/home-management/entities/interfaces/home-management.entity';
import { CreateTagDto } from '@/api/home-management/entities/dtos/tag.dto';
import { DRIZZLE_DB } from '@/db/drizzle/drizzle.constants';
import { HomeManagementDrizzleDb } from '@/db/drizzle/drizzle.client';
import { productTags, recipeTags, tags, taskTags } from '@/db/schema';
import { saveLogWithDb } from '@/common/utils/repository.utils';

export class TagRepositoryImplementation
  implements TagRepository
{
  constructor(
    @Inject(DRIZZLE_DB)
    private readonly db: HomeManagementDrizzleDb,
    private readonly logger: Logger,
  ) {}

  /**
   * Método para obtener todos las etiquetas
   * @returns string - todos las etiquetas
   */
  async findAll(): Promise<{
    entities: TagI[];
    total: number;
  }> {
    const entities = await this.db
      .select({
        tagID: tags.id,
        tagName: tags.name,
        tagType: tags.type,
      })
      .from(tags)
      .orderBy(desc(tags.name));
    const [{ total }] = await this.db
      .select({ total: count(tags.id) })
      .from(tags);
    return {
      entities,
      total,
    };
  }

  /**
   * Método para obtener lista de etiquetas filtradas
   * @returns string - lista de etiquetas filtradas
   */
  async find(
    page: number,
    limit: number,
    searchCriteria: SearchCriteriaI,
  ): Promise<{ entities: TagI[]; total: number }> {
    const whereClause = this.buildWhereClause(searchCriteria);
    const orderBy = this.resolveSort(searchCriteria?.sort?.[0]);
    const offset = page * limit;
    const baseQuery = this.db
      .select({
        tagID: tags.id,
        tagName: tags.name,
        tagType: tags.type,
      })
      .from(tags);
    const totalQuery = this.db.select({ total: count(tags.id) }).from(tags);

    const scopedQuery = whereClause ? baseQuery.where(whereClause) : baseQuery;
    const scopedTotalQuery = whereClause
      ? totalQuery.where(whereClause)
      : totalQuery;

    const entities = await scopedQuery.orderBy(orderBy).limit(limit).offset(offset);
    const [{ total }] = await scopedTotalQuery;
    return {
      entities,
      total,
    };
  }

  /**
   * Método para obtener un etiqueta por su id
   * @param id - id de la etiqueta
   * @returns string
   */
  async findById(id: string): Promise<TagI | null> {
    const result = await this.db
      .select({
        tagID: tags.id,
        tagName: tags.name,
        tagType: tags.type,
      })
      .from(tags)
      .where(eq(tags.id, Number(id)))
      .limit(1);
    return result[0] ?? null;
  }

  /**
   * Metodo para crear un nuevo etiqueta
   * @returns string - etiqueta creado
   */
  async create(dto: CreateTagDto): Promise<TagI> {
    dto = this.prepareDTO(dto);
    const response = await this.db
      .insert(tags)
      .values({
        name: dto.tagName,
        type: dto.tagType,
      })
      .returning({ id: tags.id });
    const tagID = response[0].id;

    await saveLogWithDb(this.db, 'tag', `Created tag ${tagID}`);
    return this.findById(String(tagID));
  }

  /**
   * Método para añadir una etiqueta a un item
   * @param tagID - id de la etiqueta
   * @param itemID - id del item
   * @returns void
   * @throws NotFoundException
   */
  async createItemTag(tagID: string, itemID: string): Promise<void> {
    const originalTag = await this.findById(tagID);
    if (!originalTag) {
      throw new NotFoundException('Tag not found');
    }

    if (originalTag.tagType === 'Product') {
      await this.db.insert(productTags).values({
        productId: Number(itemID),
        tagId: Number(tagID),
      });
    } else if (originalTag.tagType === 'Task') {
      await this.db.insert(taskTags).values({
        taskId: Number(itemID),
        tagId: Number(tagID),
      });
    } else if (originalTag.tagType === 'Recipe') {
      await this.db.insert(recipeTags).values({
        recipeId: Number(itemID),
        tagId: Number(tagID),
      });
    } else {
      throw new NotFoundException('Tag type not found');
    }
  }

  /**
   * Método para actualizar un etiqueta
   * Si la etiqueta no existe, se devuelve null
   * Si la etiqueta no tiene cambios, se devuelve la etiqueta original
   * @param id - id de la etiqueta
   * @param product - etiqueta
   * @returns string - etiqueta actualizado
   */
  async modify(id: string, dto: CreateTagDto): Promise<TagI> {
    const originalTag = await this.findById(id);
    if (!originalTag) {
      throw new NotFoundException('Tag not found');
    }
    dto = this.prepareDTO(dto);

    await this.db
      .update(tags)
      .set({
        name: dto.tagName,
        type: dto.tagType,
      })
      .where(eq(tags.id, Number(id)));

    await saveLogWithDb(this.db, 'tag', `Modified tag ${id}`);
    return this.findById(id);
  }

  /**
   * Método para eliminar un etiqueta
   * @param id - id de la etiqueta
   * @returns string - etiqueta eliminado
   */
  async delete(id: string): Promise<void> {
    const originalTag = await this.findById(id);
    if (!originalTag) {
      throw new NotFoundException('Tag not found');
    }
    await this.db.delete(tags).where(eq(tags.id, Number(id)));
    await saveLogWithDb(this.db, 'tag', `Deleted tag ${id}`);
  }

  /**
   * Método para eliminar una etiqueta de un item
   * @param tagID - id de la etiqueta
   * @param itemID - id del item
   * @returns null - etiqueta eliminado
   */
  async deleteItemTag(tagID: string, itemID: string) {
    const originalTag = await this.findById(tagID);
    if (!originalTag) {
      throw new NotFoundException('Tag not found');
    }

    if (originalTag.tagType === 'Product') {
      await this.db
        .delete(productTags)
        .where(
          and(
            eq(productTags.productId, Number(itemID)),
            eq(productTags.tagId, Number(tagID)),
          ),
        );
    } else if (originalTag.tagType === 'Task') {
      await this.db
        .delete(taskTags)
        .where(
          and(
            eq(taskTags.taskId, Number(itemID)),
            eq(taskTags.tagId, Number(tagID)),
          ),
        );
    } else if (originalTag.tagType === 'Recipe') {
      await this.db
        .delete(recipeTags)
        .where(
          and(
            eq(recipeTags.recipeId, Number(itemID)),
            eq(recipeTags.tagId, Number(tagID)),
          ),
        );
    } else {
      throw new NotFoundException('Tag type not found');
    }
  }

  /**
   * Método para inicializar valores opcionales del DTO
   * @param dto - DTO
   * @returns DTO
   */
  private prepareDTO(dto: CreateTagDto): CreateTagDto {
    dto = plainToInstance(CreateTagDto, dto, {
      exposeDefaultValues: true,
    });
    return dto;
  }

  /**
   * Método para convertir el resultado de la consulta a un array de etiquetas
   * @param result - resultado de la consulta
   * @returns array de etiquetas
   */
  private resolveSort(sort?: SortI): SQL {
    const order = sort?.order?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    switch (sort?.field) {
      case 'tagID':
        return order === 'ASC' ? asc(tags.id) : desc(tags.id);
      case 'tagType':
        return order === 'ASC' ? asc(tags.type) : desc(tags.type);
      case 'tagName':
      default:
        return order === 'ASC' ? asc(tags.name) : desc(tags.name);
    }
  }

  private buildWhereClause(searchCriteria?: SearchCriteriaI): SQL | undefined {
    const conditions: SQL[] = [];

    searchCriteria?.filters?.forEach((filter) => {
      const condition = this.buildFilterCondition(filter);
      if (condition) {
        conditions.push(condition);
      }
    });

    if (searchCriteria?.search) {
      conditions.push(like(tags.name, `%${searchCriteria.search}%`));
    }

    if (conditions.length === 0) {
      return undefined;
    }

    return and(...conditions);
  }

  private buildFilterCondition(filter: {
    field?: string;
    operator?: string;
    value?: string;
  }): SQL | undefined {
    if (!filter?.field || !filter?.operator || filter.value === undefined) {
      return undefined;
    }

    const definition =
      filter.field === 'tagID'
        ? { column: tags.id, isNumeric: true }
        : filter.field === 'tagName'
          ? { column: tags.name, isNumeric: false }
          : filter.field === 'tagType'
            ? { column: tags.type, isNumeric: false }
            : null;

    if (!definition) {
      return undefined;
    }

    const operator = filter.operator.toLowerCase();
    const value = definition.isNumeric ? Number(filter.value) : filter.value;

    if (operator === '=') {
      return eq(definition.column, value as never);
    }
    if (operator === '>') {
      return gt(definition.column, value as never);
    }
    if (operator === '>=') {
      return gte(definition.column, value as never);
    }
    if (operator === '<') {
      return lt(definition.column, value as never);
    }
    if (operator === '<=') {
      return lte(definition.column, value as never);
    }
    if (operator === 'like' && !definition.isNumeric) {
      return like(definition.column, `%${filter.value}%`);
    }
    if (operator === 'between') {
      const [start, end] = filter.value.split(',');
      if (definition.isNumeric) {
        return between(definition.column, Number(start), Number(end));
      }
      return between(definition.column, start, end);
    }
    if (operator === 'in') {
      const items = filter.value
        .split(',')
        .map((entry) => entry.trim().replace(/^'+|'+$/g, ''));
      return definition.isNumeric
        ? inArray(definition.column, items.map((entry) => Number(entry)))
        : inArray(definition.column, items);
    }

    return undefined;
  }
}
