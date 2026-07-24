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
import { ProductI } from '@/api/home-management/entities/interfaces/home-management.entity';
import { CreateProductDto } from '@/api/home-management/entities/dtos/product.dto';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { ProductRepository } from './products.repository.interface';
import { DRIZZLE_DB } from '@/db/drizzle/drizzle.constants';
import { HomeManagementDrizzleDb } from '@/db/drizzle/drizzle.client';
import { listOrder, products, productTags, tags } from '@/db/schema';
import { saveLogWithDb } from '@/common/utils/repository.utils';

export class ProductRepositoryImplementation implements ProductRepository {
    constructor(
        @Inject(DRIZZLE_DB)
        private readonly db: HomeManagementDrizzleDb,
        private readonly logger: Logger,
        @Inject(CACHE_MANAGER) private cacheManager: Cache,
    ) {}

    /**
     * Método para obtener todos los productos
     * @returns string - todos los productos
     */
    async findAll(): Promise<{
        entities: ProductI[];
        total: number;
    }> {
        const cacheKey = 'products';
        if (this.cacheManager) {
            const cachedProducts: {
                entities: ProductI[];
                total: number;
            } = await this.cacheManager.get(cacheKey);
            if (cachedProducts) {
                this.logger.log('Products cache hit');
                return cachedProducts;
            }
        }
        const result = await this.fetchProductRows();
        const entities: ProductI[] = this.resultToProduct(result);
        const [{ total }] = await this.db
            .select({ total: count(products.id) })
            .from(products);
        this.logger.log(
            `Products cache miss, fetched ${entities.length} products from DB`,
        );
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
    ): Promise<{ entities: ProductI[]; total: number }> {
        const whereClause = this.buildWhereClause(searchCriteria);
        const orderBy = this.resolveSort(searchCriteria?.sort?.[0]);
        const offset = page * limit;

        const idsQuery = this.db.select({ id: products.id }).from(products);
        const scopedIdsQuery = whereClause
            ? idsQuery.where(whereClause)
            : idsQuery;
        const paginatedProducts = await scopedIdsQuery
            .orderBy(orderBy)
            .limit(limit)
            .offset(offset);

        const productIds = paginatedProducts.map((product) => product.id);
        const result =
            productIds.length > 0
                ? await this.fetchProductRows(productIds, orderBy)
                : [];
        const entities: ProductI[] = this.resultToProduct(result);
        const totalQuery = this.db
            .select({ total: count(products.id) })
            .from(products);
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
    async findById(id: string): Promise<ProductI | null> {
        const result = await this.fetchProductRows([Number(id)]);
        const entities: ProductI[] = this.resultToProduct(result);
        return entities.length > 0 ? entities[0] : null;
    }

    /**
     * Método para obtener orden de productos
     * @param type - tipo de orden
     * @returns string - orden de productos
     */
    async getOrderProducts(type: string): Promise<string[]> {
        const result = await this.db
            .select({ list: listOrder.listOrder })
            .from(listOrder)
            .where(eq(listOrder.type, type))
            .limit(1);
        return result.length > 0 ? JSON.parse(result[0].list) : [];
    }

    /**
     * Método para crear un orden de productos
     * @param type - tipo de orden
     * @param order - orden de productos
     */
    async postOrderProducts(type: string, order: string[]): Promise<void> {
        await this.db
            .insert(listOrder)
            .values({
                type,
                listOrder: JSON.stringify(order),
            })
            .onConflictDoUpdate({
                target: listOrder.type,
                set: {
                    listOrder: JSON.stringify(order),
                },
            });
    }

    /**
     * Metodo para crear un nuevo producto
     * @returns string - producto creado
     */
    async create(dto: CreateProductDto): Promise<ProductI> {
        dto = this.prepareDTO(dto);
        const response = await this.db
            .insert(products)
            .values({
                name: dto.productName,
                unit: dto.productUnit,
            })
            .returning({ id: products.id });
        const productID = response[0].id;
        const newProduct = await this.findById(String(productID));

        const cachedProducts: {
            entities: ProductI[];
            total: number;
        } = await this.cacheManager.get('products');
        if (cachedProducts) {
            cachedProducts.entities.push(newProduct);
            cachedProducts.total += 1;
            await this.cacheManager.set('products', cachedProducts);
        }

        await saveLogWithDb(this.db, 'product', `Created product ${productID}`);
        return newProduct;
    }

    /**
     * Método para actualizar un producto
     * Si el producto no existe, se devuelve null
     * Si el producto no tiene cambios, se devuelve el producto original
     * @param id - id del producto
     * @param product - producto
     * @returns string - producto actualizado
     */
    async modify(id: string, dto: CreateProductDto): Promise<ProductI> {
        const originalProduct = await this.findById(id);
        if (!originalProduct) {
            throw new NotFoundException('Product not found');
        }
        dto = this.prepareDTO(dto);

        await this.db
            .update(products)
            .set({
                name: dto.productName,
                unit: dto.productUnit,
            })
            .where(eq(products.id, Number(id)));
        const product = await this.findById(id);

        const cachedProducts: {
            entities: ProductI[];
            total: number;
        } = await this.cacheManager.get('products');
        if (cachedProducts) {
            const index = cachedProducts.entities.findIndex(
                (p: ProductI) => p.productID.toString() === id,
            );
            if (index !== -1) {
                cachedProducts.entities[index] = product;
                await this.cacheManager.set('products', cachedProducts);
            }
        }

        await saveLogWithDb(this.db, 'product', `Modified product ${id}`);
        return product;
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
        await this.db.delete(products).where(eq(products.id, Number(id)));

        const cachedProducts: {
            entities: ProductI[];
            total: number;
        } = await this.cacheManager.get('products');
        if (cachedProducts) {
            const index = cachedProducts.entities.findIndex(
                (p: ProductI) => p.productID.toString() === id,
            );
            if (index !== -1) {
                cachedProducts.entities.splice(index, 1);
                cachedProducts.total = Math.max(0, cachedProducts.total - 1);
                await this.cacheManager.set('products', cachedProducts);
            }
        }

        await saveLogWithDb(this.db, 'product', `Deleted product ${id}`);
    }

    /**
     * Método para inicializar valores opcionales del DTO
     * @param dto - DTO
     * @returns DTO
     */
    private prepareDTO(dto: CreateProductDto): CreateProductDto {
        dto = plainToInstance(CreateProductDto, dto, {
            exposeDefaultValues: true,
        });
        return dto;
    }

    /**
     * Método para convertir el resultado de la consulta a un array de productos
     * @param result - resultado de la consulta
     * @returns array de productos
     */
    private resultToProduct(result: ProductRow[]): ProductI[] {
        const mappedProducts: Map<number, ProductI> = new Map();
        result.forEach((record: ProductRow) => {
            let product: ProductI;
            if (mappedProducts.has(record.productID)) {
                product = mappedProducts.get(record.productID);
            } else {
                product = {
                    productID: record.productID,
                    productName: record.productName,
                    productUnit: record.productUnit,
                    productDateLastBought: record.productDateLastBought,
                    productDateLastConsumed: record.productDateLastConsumed,
                    tags: [],
                };
                mappedProducts.set(record.productID, product);
            }

            if (
                record.tagID &&
                !product.tags.some((tag) => tag.tagID === record.tagID)
            ) {
                product.tags.push({
                    tagID: record.tagID,
                    tagName: record.tagName,
                    tagType: record.tagType,
                });
            }
        });
        return Array.from(mappedProducts.values());
    }

    private async fetchProductRows(
        productIds?: number[],
        orderBy?: SQL,
    ): Promise<ProductRow[]> {
        const query = this.db
            .select({
                productID: products.id,
                productName: products.name,
                productUnit: products.unit,
                productDateLastBought: products.lastBoughtAt,
                productDateLastConsumed: products.lastConsumedAt,
                tagID: tags.id,
                tagName: tags.name,
                tagType: tags.type,
            })
            .from(products)
            .leftJoin(productTags, eq(productTags.productId, products.id))
            .leftJoin(tags, eq(tags.id, productTags.tagId));
        const scopedQuery = productIds?.length
            ? query.where(inArray(products.id, productIds))
            : query;

        return scopedQuery.orderBy(orderBy ?? desc(products.name));
    }

    private resolveSort(sort?: SortI): SQL {
        const order = sort?.order?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

        switch (sort?.field) {
            case 'productID':
                return order === 'ASC' ? asc(products.id) : desc(products.id);
            case 'productUnit':
                return order === 'ASC'
                    ? asc(products.unit)
                    : desc(products.unit);
            case 'productDateLastBought':
                return order === 'ASC'
                    ? asc(products.lastBoughtAt)
                    : desc(products.lastBoughtAt);
            case 'productDateLastConsumed':
                return order === 'ASC'
                    ? asc(products.lastConsumedAt)
                    : desc(products.lastConsumedAt);
            case 'productName':
            default:
                return order === 'ASC'
                    ? asc(products.name)
                    : desc(products.name);
        }
    }

    private buildWhereClause(
        searchCriteria?: SearchCriteriaI,
    ): SQL | undefined {
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
            filter.field === 'productID'
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
        const value = definition.isNumeric
            ? Number(filter.value)
            : filter.value;

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
                ? inArray(
                      definition.column,
                      items.map((entry) => Number(entry)),
                  )
                : inArray(definition.column, items);
        }

        return undefined;
    }
}

interface ProductRow {
    productID: number;
    productName: string;
    productUnit: string | null;
    productDateLastBought: string | null;
    productDateLastConsumed: string | null;
    tagID: number | null;
    tagName: string | null;
    tagType: string | null;
}
