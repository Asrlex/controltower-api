import { forwardRef, Inject, Logger, NotFoundException } from '@nestjs/common';
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
import {
  ShoppingListProductI,
  StockProductI,
} from '@/api/home-management/entities/interfaces/home-management.entity';
import {
  CreateShoppingListProductDto,
} from '@/api/home-management/entities/dtos/shopping-list.dto';
import { StockProductRepository } from '../../stock/repository/stock.repository.interface';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { ShoppingListProductRepository } from './shopping-list.repository.interface';
import { DRIZZLE_DB } from '@/db/drizzle/drizzle.constants';
import { HomeManagementDrizzleDb } from '@/db/drizzle/drizzle.client';
import { productTags, products, shoppingList, shops, tags } from '@/db/schema';
import { saveLogWithDb } from '@/common/utils/repository.utils';

export class ShoppingListProductRepositoryImplementation
  implements ShoppingListProductRepository
{
  constructor(
    @Inject(DRIZZLE_DB)
    private readonly db: HomeManagementDrizzleDb,
    private readonly logger: Logger,
    @Inject(forwardRef(() => 'STOCK_PRODUCT_REPOSITORY'))
    protected readonly stockProductRepository: StockProductRepository,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  /**
   * Método para obtener todos los productos
   * @returns string - todos los productos
   */
  async findAll(): Promise<{
    entities: ShoppingListProductI[];
    total: number;
  }> {
    const cacheKey = 'shopping-list';
    if (this.cacheManager) {
      const cachedShoppingList: {
        entities: ShoppingListProductI[];
        total: number;
      } = await this.cacheManager.get(cacheKey);
      if (cachedShoppingList) {
        this.logger.log('Shopping list cache hit');
        return cachedShoppingList;
      }
    }
    const result = await this.fetchShoppingListRows();
    const entities: ShoppingListProductI[] = this.resultToProduct(result);
    const [{ total }] = await this.db
      .select({ total: count(shoppingList.id) })
      .from(shoppingList);
    if (this.cacheManager) {
      await this.cacheManager.set(cacheKey, { entities, total });
    }
    return {
      entities,
      total: Number(total),
    };
  }

  /**
   * Método para obtener lista de productos filtrados
   * @returns string - lista de productos filtrados
   */
  async find(
    page: number,
    limit: number,
    searchCriteria: SearchCriteriaI,
  ): Promise<{ entities: ShoppingListProductI[]; total: number }> {
    const whereClause = this.buildWhereClause(searchCriteria);
    const orderBy = this.resolveSort(searchCriteria?.sort?.[0]);
    const offset = page * limit;

    const idsQuery = this.db
      .select({ id: shoppingList.id })
      .from(shoppingList)
      .innerJoin(products, eq(products.id, shoppingList.productId))
      .innerJoin(shops, eq(shops.id, shoppingList.storeId));
    const scopedIdsQuery = whereClause ? idsQuery.where(whereClause) : idsQuery;
    const paginatedRows = await scopedIdsQuery
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset);
    const shoppingListIds = paginatedRows.map((item) => item.id);
    const result = shoppingListIds.length > 0
      ? await this.fetchShoppingListRows(shoppingListIds, orderBy)
      : [];
    const entities: ShoppingListProductI[] = this.resultToProduct(result);
    const totalQuery = this.db
      .select({ total: count(shoppingList.id) })
      .from(shoppingList)
      .innerJoin(products, eq(products.id, shoppingList.productId))
      .innerJoin(shops, eq(shops.id, shoppingList.storeId));
    const [{ total }] = whereClause
      ? await totalQuery.where(whereClause)
      : await totalQuery;

    return {
      entities,
      total: Number(total),
    };
  }

  /**
   * Método para obtener un producto por su id
   * @param id - id del producto
   * @returns string
   */
  async findById(id: string): Promise<ShoppingListProductI | null> {
    const result = await this.fetchShoppingListRows([Number(id)]);
    const entities: ShoppingListProductI[] = this.resultToProduct(result);
    return entities.length > 0 ? entities[0] : null;
  }

  /**
   * Metodo para crear un nuevo producto
   * @returns string - producto creado
   */
  async create(
    dto: CreateShoppingListProductDto,
  ): Promise<ShoppingListProductI> {
    dto = this.prepareDTO(dto);
    const response = await this.db
      .insert(shoppingList)
      .values({
        amount: dto.shoppingListAmount,
        productId: dto.shoppingListProductID,
        storeId: dto.shopID,
      })
      .returning({ id: shoppingList.id });
    const productID = response[0].id;
    const newShoppingListProduct = await this.findById(String(productID));

    const cachedShoppingList: {
      entities: ShoppingListProductI[];
      total: number;
    } = await this.cacheManager.get('shopping-list');
    if (cachedShoppingList) {
      cachedShoppingList.entities.push(newShoppingListProduct);
      cachedShoppingList.total += 1;
      await this.cacheManager.set('shopping-list', cachedShoppingList);
    }

    await saveLogWithDb(this.db, 'shopping_list', `Created product ${productID}`);
    return newShoppingListProduct;
  }

  /**
   * Método para actualizar un producto
   * Si el producto no existe, se devuelve null
   * Si el producto no tiene cambios, se devuelve el producto original
   * @param id - id del producto
   * @param product - producto
   * @returns string - producto actualizado
   */
  async modify(
    id: string,
    dto: CreateShoppingListProductDto,
  ): Promise<ShoppingListProductI> {
    const originalProduct = await this.findById(id);
    if (!originalProduct) {
      throw new NotFoundException('Product not found');
    }
    dto = this.prepareDTO(dto);

    await this.db
      .update(shoppingList)
      .set({
        amount: dto.shoppingListAmount,
        productId: dto.shoppingListProductID,
      })
      .where(eq(shoppingList.id, Number(id)));
    const editedProduct = await this.findById(id);

    const cachedShoppingList: {
      entities: ShoppingListProductI[];
      total: number;
    } = await this.cacheManager.get('shopping-list');
    if (cachedShoppingList) {
      const index = cachedShoppingList.entities.findIndex(
        (p: ShoppingListProductI) => p.shoppingListProductID.toString() === id,
      );
      if (index !== -1) {
        cachedShoppingList.entities[index] = editedProduct;
        await this.cacheManager.set('shopping-list', cachedShoppingList);
      }
    }

    await saveLogWithDb(this.db, 'shopping_list', `Modified product ${id}`);
    return editedProduct;
  }

  /**
   * Método para comprar un producto
   * @param shoppingListProductID - id del producto
   * @returns string - producto comprado
   */
  async buyProduct(shoppingListProductID: string): Promise<StockProductI> {
    const originalProduct = await this.findById(shoppingListProductID);
    if (!originalProduct) {
      throw new NotFoundException('Product not found');
    }

    await this.delete(shoppingListProductID);
    const response = await this.stockProductRepository.create({
      stockProductID: originalProduct.product.productID,
      stockProductAmount: originalProduct.shoppingListProductAmount,
    });
    await saveLogWithDb(this.db, 'shopping_list', `Bought product ${shoppingListProductID}`);
    return response;
  }

  /**
   * Método para modificar la cantidad de un producto
   * @param productId - id del producto
   * @param amount - cantidad
   * @returns string - producto modificado
   */
  async modifyAmount(productId: string, amount: number): Promise<void> {
    const originalProduct = await this.findById(productId);
    if (!originalProduct) {
      throw new NotFoundException('Product not found');
    }
    await this.db
      .update(shoppingList)
      .set({ amount })
      .where(eq(shoppingList.id, Number(productId)));
    await saveLogWithDb(this.db, 'shopping_list', `Modified amount of product ${productId}`);
  }

  /**
   * Método para eliminar un producto
   * @param id - id del producto
   * @returns string - producto eliminado
   */
  async delete(id: string): Promise<void> {
    const originalProduct = await this.findById(id);
    if (!originalProduct) {
      throw new NotFoundException('Product not found');
    }
    await this.db.delete(shoppingList).where(eq(shoppingList.id, Number(id)));

    const cachedShoppingList: {
      entities: ShoppingListProductI[];
      total: number;
    } = await this.cacheManager.get('shopping-list');
    if (cachedShoppingList) {
      const index = cachedShoppingList.entities.findIndex(
        (p: ShoppingListProductI) => p.shoppingListProductID.toString() === id,
      );
      if (index !== -1) {
        cachedShoppingList.entities.splice(index, 1);
        cachedShoppingList.total = Math.max(0, cachedShoppingList.total - 1);
        await this.cacheManager.set('shopping-list', cachedShoppingList);
      }
    }

    await saveLogWithDb(this.db, 'shopping_list', `Deleted product ${id}`);
  }

  /**
   * Método para inicializar valores opcionales del DTO
   * @param dto - DTO
   * @returns DTO
   */
  private prepareDTO(
    dto: CreateShoppingListProductDto,
  ): CreateShoppingListProductDto {
    return { ...dto };
  }

  /**
   * Método para convertir el resultado de la consulta a un array de productos
   * @param result - resultado de la consulta
   * @returns array de productos
   */
  private resultToProduct(
    result: ShoppingListRow[],
  ): ShoppingListProductI[] {
    const mappedProducts: Map<number, ShoppingListProductI> = new Map();
    result.forEach((record: ShoppingListRow) => {
      let product: ShoppingListProductI;
      if (mappedProducts.has(record.shoppingListProductID)) {
        product = mappedProducts.get(record.shoppingListProductID);
      } else {
        product = {
          shoppingListProductID: record.shoppingListProductID,
          shoppingListProductAmount: record.shoppingListAmount,
          product: {
            productID: record.productID,
            productName: record.productName,
            productUnit: record.productUnit,
            productDateLastBought: record.productDateLastBought,
            productDateLastConsumed: record.productDateLastConsumed,
            tags: [],
          },
          shop: {
            shopID: record.shopID,
            shopName: record.shopName,
          },
        };
        mappedProducts.set(record.shoppingListProductID, product);
      }

      if (record.tagID && !product.product.tags.some((tag) => tag.tagID === record.tagID)) {
        product.product.tags.push({
          tagID: record.tagID,
          tagName: record.tagName,
          tagType: record.tagType,
        });
      }
    });
    return Array.from(mappedProducts.values());
  }

  private async fetchShoppingListRows(
    ids?: number[],
    orderBy?: SQL,
  ): Promise<ShoppingListRow[]> {
    const query = this.db
      .select({
        shoppingListProductID: shoppingList.id,
        shoppingListAmount: shoppingList.amount,
        productID: products.id,
        productName: products.name,
        productUnit: products.unit,
        productDateLastBought: products.lastBoughtAt,
        productDateLastConsumed: products.lastConsumedAt,
        shopID: shops.id,
        shopName: shops.name,
        tagID: tags.id,
        tagName: tags.name,
        tagType: tags.type,
      })
      .from(shoppingList)
      .innerJoin(products, eq(products.id, shoppingList.productId))
      .innerJoin(shops, eq(shops.id, shoppingList.storeId))
      .leftJoin(productTags, eq(productTags.productId, products.id))
      .leftJoin(tags, eq(tags.id, productTags.tagId));

    const scopedQuery = ids?.length
      ? query.where(inArray(shoppingList.id, ids))
      : query;

    return scopedQuery.orderBy(orderBy ?? desc(products.name));
  }

  private resolveSort(sort?: SortI): SQL {
    const order = sort?.order?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    switch (sort?.field) {
      case 'shoppingListProductID':
        return order === 'ASC' ? asc(shoppingList.id) : desc(shoppingList.id);
      case 'shoppingListAmount':
        return order === 'ASC' ? asc(shoppingList.amount) : desc(shoppingList.amount);
      case 'shopName':
        return order === 'ASC' ? asc(shops.name) : desc(shops.name);
      case 'productUnit':
        return order === 'ASC' ? asc(products.unit) : desc(products.unit);
      case 'productName':
      default:
        return order === 'ASC' ? asc(products.name) : desc(products.name);
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
      conditions.push(like(products.name, `%${searchCriteria.search}%`));
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
      filter.field === 'shoppingListProductID'
        ? { column: shoppingList.id, isNumeric: true }
        : filter.field === 'shoppingListAmount'
          ? { column: shoppingList.amount, isNumeric: true }
          : filter.field === 'productID'
            ? { column: products.id, isNumeric: true }
            : filter.field === 'productName'
              ? { column: products.name, isNumeric: false }
              : filter.field === 'productUnit'
                ? { column: products.unit, isNumeric: false }
                : filter.field === 'shopID'
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

interface ShoppingListRow {
  shoppingListProductID: number;
  shoppingListAmount: number;
  productID: number;
  productName: string;
  productUnit: string | null;
  productDateLastBought: string | null;
  productDateLastConsumed: string | null;
  shopID: number;
  shopName: string;
  tagID: number | null;
  tagName: string | null;
  tagType: string | null;
}
