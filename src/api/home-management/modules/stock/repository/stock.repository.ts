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
  CreateStockProductDto,
} from '@/api/home-management/entities/dtos/stock-product.dto';
import { ShoppingListProductRepository } from '../../shopping-list/repository/shopping-list.repository.interface';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { StockProductRepository } from './stock.repository.interface';
import { DRIZZLE_DB } from '@/db/drizzle/drizzle.constants';
import { HomeManagementDrizzleDb } from '@/db/drizzle/drizzle.client';
import { pantry, products, productTags, tags } from '@/db/schema';
import { saveLogWithDb } from '@/common/utils/repository.utils';

export class StockProductRepositoryImplementation
  implements StockProductRepository
{
  constructor(
    @Inject(DRIZZLE_DB)
    private readonly db: HomeManagementDrizzleDb,
    private readonly logger: Logger,
    @Inject(forwardRef(() => 'SHOPPING_LIST_PRODUCT_REPOSITORY'))
    protected readonly shoppingListProductRepository: ShoppingListProductRepository,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  /**
   * Método para obtener todos los productos
   * @returns string - todos los productos
   */
  async findAll(): Promise<{
    entities: StockProductI[];
    total: number;
  }> {
    const cacheKey = 'stock';
    if (this.cacheManager) {
      const cachedStock: {
        entities: StockProductI[];
        total: number;
      } = await this.cacheManager.get(cacheKey);
      if (cachedStock) {
        this.logger.log('Stock cache hit');
        return cachedStock;
      }
    }
    const result = await this.fetchStockRows();
    const entities: StockProductI[] = this.resultToProduct(result);
    const [{ total }] = await this.db
      .select({ total: count(pantry.id) })
      .from(pantry);
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
  ): Promise<{ entities: StockProductI[]; total: number }> {
    const whereClause = this.buildWhereClause(searchCriteria);
    const orderBy = this.resolveSort(searchCriteria?.sort?.[0]);
    const offset = page * limit;

    const idsQuery = this.db.select({ id: pantry.id }).from(pantry)
      .leftJoin(products, eq(products.id, pantry.productId));
    const scopedIdsQuery = whereClause ? idsQuery.where(whereClause) : idsQuery;
    const paginatedStock = await scopedIdsQuery
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset);

    const stockIds = paginatedStock.map((item) => item.id);
    const result = stockIds.length > 0
      ? await this.fetchStockRows(stockIds, orderBy)
      : [];
    const entities: StockProductI[] = this.resultToProduct(result);
    const totalQuery = this.db
      .select({ total: count(pantry.id) })
      .from(pantry)
      .leftJoin(products, eq(products.id, pantry.productId));
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
  async findById(id: string): Promise<StockProductI | null> {
    const result = await this.fetchStockRows([Number(id)]);
    const entities: StockProductI[] = this.resultToProduct(result);
    return entities.length > 0 ? entities[0] : null;
  }

  /**
   * Metodo para crear un nuevo producto
   * @returns string - producto creado
   */
  async create(dto: CreateStockProductDto): Promise<StockProductI> {
    dto = this.prepareDTO(dto);
    const response = await this.db
      .insert(pantry)
      .values({
        amount: dto.stockProductAmount,
        productId: dto.stockProductID,
      })
      .returning({ id: pantry.id });
    const productID = response[0].id;
    const newStockProduct = await this.findById(String(productID));

    const cachedStock: { entities: StockProductI[]; total: number } =
      await this.cacheManager.get('stock');
    if (cachedStock) {
      cachedStock.entities.push(newStockProduct);
      cachedStock.total += 1;
      await this.cacheManager.set('stock', cachedStock);
    }

    await saveLogWithDb(this.db, 'product', `Created product ${productID}`);
    return newStockProduct;
  }

  /**
   * Método para actualizar un producto
   * Si el producto no existe, se devuelve null
   * Si el producto no tiene cambios, se devuelve el producto original
   * @param id - id del producto
   * @param product - producto
   * @returns string - producto actualizado
   */
  async modify(id: string, dto: CreateStockProductDto): Promise<StockProductI> {
    const originalProduct = await this.findById(id);
    if (!originalProduct) {
      throw new NotFoundException('Product not found');
    }
    dto = this.prepareDTO(dto);

    await this.db
      .update(pantry)
      .set({
        amount: dto.stockProductAmount,
        productId: dto.stockProductID,
      })
      .where(eq(pantry.id, Number(id)));

    await saveLogWithDb(this.db, 'product', `Modified product ${id}`);
    return this.findById(id);
  }

  /**
   * Método para comprar un producto
   * @param stockProductID - id del producto
   * @returns string - producto comprado
   */
  async addProductToShoppingList(
    stockProductID: string,
  ): Promise<ShoppingListProductI> {
    const originalProduct = await this.findById(stockProductID);
    if (!originalProduct) {
      throw new NotFoundException('Product not found');
    }
    await this.delete(stockProductID);
    const response = await this.shoppingListProductRepository.create({
      shoppingListProductID: originalProduct.product.productID,
      shoppingListAmount: originalProduct.stockProductAmount,
      shopID: 2,
    });
    await saveLogWithDb(this.db, 'shopping_list', `Bought product ${stockProductID}`);
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
      .update(pantry)
      .set({ amount })
      .where(eq(pantry.id, Number(productId)));
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

    const cachedStock: { entities: StockProductI[]; total: number } =
      await this.cacheManager.get('stock');
    if (cachedStock) {
      const index = cachedStock.entities.findIndex(
        (product) => product.stockProductID === Number(id),
      );
      if (index !== -1) {
        cachedStock.entities.splice(index, 1);
        cachedStock.total = Math.max(0, cachedStock.total - 1);
        await this.cacheManager.set('stock', cachedStock);
      }
    }

    await this.db.delete(pantry).where(eq(pantry.id, Number(id)));
    await saveLogWithDb(this.db, 'product', `Deleted product ${id}`);
  }

  /**
   * Método para inicializar valores opcionales del DTO
   * @param dto - DTO
   * @returns DTO
   */
  private prepareDTO(dto: CreateStockProductDto): CreateStockProductDto {
    dto = plainToInstance(CreateStockProductDto, dto, {
      exposeDefaultValues: true,
    });
    return dto;
  }

  /**
   * Método para convertir el resultado de la consulta a un array de productos
   * @param result - resultado de la consulta
   * @returns array de productos
   */
  private resultToProduct(result: StockRow[]): StockProductI[] {
    const mappedProducts: Map<number, StockProductI> = new Map();
    result.forEach((record: StockRow) => {
      let product: StockProductI;
      if (mappedProducts.has(record.stockProductID)) {
        product = mappedProducts.get(record.stockProductID);
      } else {
        product = {
          stockProductID: record.stockProductID,
          stockProductAmount: record.stockProductAmount,
          product: {
            productID: record.productID,
            productName: record.productName,
            productUnit: record.productUnit,
            productDateLastBought: record.productDateLastBought,
            productDateLastConsumed: record.productDateLastConsumed,
            tags: [],
          },
        };

        mappedProducts.set(record.stockProductID, product);
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

  private async fetchStockRows(
    stockIds?: number[],
    orderBy?: SQL,
  ): Promise<StockRow[]> {
    const query = this.db
      .select({
        stockProductID: pantry.id,
        stockProductAmount: pantry.amount,
        productID: products.id,
        productName: products.name,
        productUnit: products.unit,
        productDateLastBought: products.lastBoughtAt,
        productDateLastConsumed: products.lastConsumedAt,
        tagID: tags.id,
        tagName: tags.name,
        tagType: tags.type,
      })
      .from(pantry)
      .innerJoin(products, eq(products.id, pantry.productId))
      .leftJoin(productTags, eq(productTags.productId, products.id))
      .leftJoin(tags, eq(tags.id, productTags.tagId));

    const scopedQuery = stockIds?.length
      ? query.where(inArray(pantry.id, stockIds))
      : query;

    return scopedQuery.orderBy(orderBy ?? desc(products.name));
  }

  private resolveSort(sort?: SortI): SQL {
    const order = sort?.order?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    switch (sort?.field) {
      case 'stockProductID':
        return order === 'ASC' ? asc(pantry.id) : desc(pantry.id);
      case 'stockProductAmount':
        return order === 'ASC' ? asc(pantry.amount) : desc(pantry.amount);
      case 'productUnit':
        return order === 'ASC' ? asc(products.unit) : desc(products.unit);
      case 'productDateLastBought':
        return order === 'ASC' ? asc(products.lastBoughtAt) : desc(products.lastBoughtAt);
      case 'productDateLastConsumed':
        return order === 'ASC'
          ? asc(products.lastConsumedAt)
          : desc(products.lastConsumedAt);
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
      filter.field === 'stockProductID'
        ? { column: pantry.id, isNumeric: true }
        : filter.field === 'stockProductAmount'
          ? { column: pantry.amount, isNumeric: true }
          : filter.field === 'productID'
            ? { column: products.id, isNumeric: true }
            : filter.field === 'productName'
              ? { column: products.name, isNumeric: false }
              : filter.field === 'productUnit'
                ? { column: products.unit, isNumeric: false }
                : filter.field === 'productDateLastBought'
                  ? { column: products.lastBoughtAt, isNumeric: false }
                  : filter.field === 'productDateLastConsumed'
                    ? { column: products.lastConsumedAt, isNumeric: false }
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

interface StockRow {
  stockProductID: number;
  stockProductAmount: number;
  productID: number;
  productName: string;
  productUnit: string | null;
  productDateLastBought: string | null;
  productDateLastConsumed: string | null;
  tagID: number | null;
  tagName: string | null;
  tagType: string | null;
}
