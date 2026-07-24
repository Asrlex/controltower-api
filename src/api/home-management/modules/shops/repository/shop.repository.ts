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
import { CreateShopDto } from '@/api/home-management/entities/dtos/shop.dto';
import { ShopI } from '@/api/home-management/entities/interfaces/home-management.entity';
import { IShopRepository } from './shop.repository.interface';
import { DRIZZLE_DB } from '@/db/drizzle/drizzle.constants';
import { HomeManagementDrizzleDb } from '@/db/drizzle/drizzle.client';
import { shops } from '@/db/schema';
import { saveLogWithDb } from '@/common/utils/repository.utils';

export class ShopRepositoryImplementation
  implements IShopRepository
{
  constructor(
    @Inject(DRIZZLE_DB)
    private readonly db: HomeManagementDrizzleDb,
    private readonly logger: Logger,
  ) {}

  /**
   * Método para obtener todos las tiendas
   * @returns string - todos las tiendas
   */
  async findAll(): Promise<{
    entities: ShopI[];
    total: number;
  }> {
    const entities = await this.db
      .select({
        shopID: shops.id,
        shopName: shops.name,
      })
      .from(shops)
      .orderBy(desc(shops.name));
    const [{ total }] = await this.db
      .select({ total: count(shops.id) })
      .from(shops);
    return {
      entities,
      total,
    };
  }

  /**
   * Método para obtener lista de tiendas filtradas
   * @returns string - lista de tiendas filtradas
   */
  async find(
    page: number,
    limit: number,
    searchCriteria: SearchCriteriaI,
  ): Promise<{ entities: ShopI[]; total: number }> {
    const whereClause = this.buildWhereClause(searchCriteria);
    const orderBy = this.resolveSort(searchCriteria?.sort?.[0]);
    const offset = page * limit;

    const baseQuery = this.db
      .select({
        shopID: shops.id,
        shopName: shops.name,
      })
      .from(shops);
    const totalQuery = this.db.select({ total: count(shops.id) }).from(shops);

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
   * Método para obtener un tiendas por su id
   * @param id - id del tiendas
   * @returns string
   */
  async findById(id: string): Promise<ShopI | null> {
    const entity = await this.db
      .select({
        shopID: shops.id,
        shopName: shops.name,
      })
      .from(shops)
      .where(eq(shops.id, Number(id)))
      .limit(1);
    return entity[0] ?? null;
  }

  /**
   * Metodo para crear un nuevo tiendas
   * @returns string - tiendas creado
   */
  async create(dto: CreateShopDto): Promise<ShopI> {
    dto = this.prepareDTO(dto);
    const response = await this.db
      .insert(shops)
      .values({ name: dto.shopName })
      .returning({ id: shops.id });
    const shopID = response[0].id;

    await saveLogWithDb(this.db, 'shop', `Created shop ${shopID}`);
    return this.findById(String(shopID));
  }

  /**
   * Método para actualizar un tiendas
   * Si el tiendas no existe, se devuelve null
   * Si el tiendas no tiene cambios, se devuelve el tiendas original
   * @param id - id del tiendas
   * @param product - tiendas
   * @returns string - tiendas actualizado
   */
  async modify(id: string, dto: CreateShopDto): Promise<ShopI> {
    const originalProduct = await this.findById(id);
    if (!originalProduct) {
      throw new NotFoundException('Product not found');
    }
    dto = this.prepareDTO(dto);

    await this.db
      .update(shops)
      .set({ name: dto.shopName })
      .where(eq(shops.id, Number(id)));

    await saveLogWithDb(this.db, 'shop', `Modified shop ${id}`);
    return this.findById(id);
  }

  /**
   * Método para eliminar un tiendas
   * @param id - id del tiendas
   * @returns string - tiendas eliminada
   */
  async delete(id: string): Promise<void> {
    const originalProduct = await this.findById(id);
    if (!originalProduct) {
      throw new NotFoundException('Product not found');
    }
    await this.db.delete(shops).where(eq(shops.id, Number(id)));
    await saveLogWithDb(this.db, 'shop', `Deleted shop ${id}`);
  }

  /**
   * Método para inicializar valores opcionales del DTO
   * @param dto - DTO
   * @returns DTO
   */
  private prepareDTO(dto: CreateShopDto): CreateShopDto {
    dto = plainToInstance(CreateShopDto, dto, {
      exposeDefaultValues: true,
    });
    return dto;
  }

  /**
   * Método para convertir el resultado de la consulta a un array de tiendas
   * @param result - resultado de la consulta
   * @returns array de tiendas
   */
  private resolveSort(sort?: SortI) {
    if (!sort?.field || sort.field === 'shopName') {
      return sort?.order?.toUpperCase() === 'ASC'
        ? asc(shops.name)
        : desc(shops.name);
    }

    if (sort.field === 'shopID') {
      return sort?.order?.toUpperCase() === 'ASC'
        ? asc(shops.id)
        : desc(shops.id);
    }

    return desc(shops.name);
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
      conditions.push(like(shops.name, `%${searchCriteria.search}%`));
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
      filter.field === 'shopID'
        ? { column: shops.id, isNumeric: true }
        : filter.field === 'shopName'
          ? { column: shops.name, isNumeric: false }
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
