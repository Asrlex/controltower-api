import { Inject, Logger, NotFoundException } from '@nestjs/common';
import { DatabaseConnection } from 'src/db/database.connection';
import { SortI } from 'src/api/entities/interfaces/api.entity';
import { plainToInstance } from 'class-transformer';
import { ProductI } from '@/api/home-management/entities/interfaces/home-management.entity';
import {
  CreateProductDto,
  GetProductDto,
} from '@/api/home-management/entities/dtos/product.dto';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { BaseRepository } from '@/common/repository/base-repository';
import { ProductRepository } from './products.repository.interface';
import { productsQueries } from '@/db/queries/products.queries';

export class ProductRepositoryImplementation
  extends BaseRepository
  implements ProductRepository
{
  constructor(
    @Inject('HOME_MANAGEMENT_CONNECTION')
    private readonly homeManagementDbConnection: DatabaseConnection,
    private readonly logger: Logger,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {
    super(homeManagementDbConnection);
  }

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
    const sql = productsQueries.findAll;
    const result = await this.homeManagementDbConnection.execute(sql);
    const entities: ProductI[] = this.resultToProduct(result);
    const total = result[0] ? parseInt(result[0].total, 10) : 0;
    if (this.cacheManager) {
      await this.cacheManager.set(cacheKey, { entities, total });
    }
    return {
      entities,
      total,
    };
  }

  /**
   * Método para obtener lista de productos filtrados
   * @returns string - lista de productos filtrados
   */
  async find(
    page: number,
    limit: number,
    searchCriteria: any,
  ): Promise<{ entities: ProductI[]; total: number }> {
    let filters = '';
    let sort: SortI = { field: 'productName', order: 'DESC' };
    if (searchCriteria) {
      const sqlFilters = this.filterstoSQL(searchCriteria);
      filters = this.addSearchToFilters(
        sqlFilters.filters,
        searchCriteria.search,
      );
      sort = sqlFilters.sort || sort;
    }
    const offset: number = page * limit + 1;
    limit = offset + parseInt(limit.toString(), 10) - 1;
    const sql = productsQueries.find
      .replaceAll('@DynamicWhereClause', filters)
      .replaceAll('@DynamicOrderByField', `${sort.field}`)
      .replaceAll('@DynamicOrderByDirection', `${sort.order}`)
      .replace('@start', offset.toString())
      .replace('@end', limit.toString());
    const result = await this.homeManagementDbConnection.execute(sql);
    const entities: ProductI[] = this.resultToProduct(result);
    return {
      entities,
      total: result[0] ? parseInt(result[0].total, 10) : 0,
    };
  }

  /**
   * Método para obtener un producto por su id
   * @param id - id del producto
   * @returns string
   */
  async findById(id: string): Promise<ProductI | null> {
    const sql = productsQueries.findByID.replace('@id', id);
    const result = await this.homeManagementDbConnection.execute(sql);
    const entities: ProductI[] = this.resultToProduct(result);
    return entities.length > 0 ? entities[0] : null;
  }

  /**
   * Método para obtener orden de productos
   * @param type - tipo de orden
   * @returns string - orden de productos
   */
  async getOrderProducts(type: string): Promise<string[]> {
    const sql = productsQueries.getOrderProducts.replaceAll('@id', `'${type}'`);
    const result = await this.homeManagementDbConnection.execute(sql);
    return result.length > 0 ? JSON.parse(result[0].listOrder) : [];
  }

  /**
   * Método para crear un orden de productos
   * @param type - tipo de orden
   * @param order - orden de productos
   */
  async postOrderProducts(type: string, order: string[]): Promise<void> {
    const originalOrder = await this.getOrderProducts(type);
    if (originalOrder) {
      const sqlDelete = productsQueries.deleteOrderProducts.replaceAll(
        '@DeleteFields',
        `type = '${type}'`,
      );
      await this.homeManagementDbConnection.execute(sqlDelete);
    }

    const sql = productsQueries.postOrderProducts.replaceAll(
      '@InsertValues',
      `'${type}', '${JSON.stringify(order)}'`,
    );
    console.log(sql);
    await this.homeManagementDbConnection.execute(sql);
  }

  /**
   * Metodo para crear un nuevo producto
   * @returns string - producto creado
   */
  async create(dto: CreateProductDto): Promise<ProductI> {
    dto = this.prepareDTO(dto);
    const sqlProduct = productsQueries.create.replace(
      '@InsertValues',
      `'${dto.productName}', '${dto.productUnit}'`,
    );
    const responseProduct =
      await this.homeManagementDbConnection.execute(sqlProduct);
    const productID = responseProduct[0].id;
    const newProduct = await this.findById(productID);

    const products: {
      entities: ProductI[];
      total: number;
    } = await this.cacheManager.get('products');
    if (products) {
      products.entities.push(newProduct);
      await this.cacheManager.set('products', products);
    }

    await this.saveLog('insert', 'product', `Created product ${productID}`);
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

    const sqlProduct = productsQueries.update
      .replace('@name', dto.productName)
      .replace('@unit', dto.productUnit)
      .replace('@id', id);
    await this.homeManagementDbConnection.execute(sqlProduct);
    const product = await this.findById(id);

    const products: {
      entities: ProductI[];
      total: number;
    } = await this.cacheManager.get('products');
    if (products) {
      const index = products.entities.findIndex(
        (p: ProductI) => p.productID.toString() === id,
      );
      products.entities[index] = product;
      await this.cacheManager.set('products', products);
    }

    await this.saveLog('update', 'product', `Modified product ${id}`);
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
    const sql = productsQueries.delete.replace('@id', id);
    await this.homeManagementDbConnection.execute(sql);

    const products: {
      entities: ProductI[];
      total: number;
    } = await this.cacheManager.get('products');
    if (products) {
      const index = products.entities.findIndex(
        (p: ProductI) => p.productID.toString() === id,
      );
      products.entities.splice(index, 1);
      await this.cacheManager.set('products', products);
    }

    await this.saveLog('delete', 'product', `Deleted product ${id}`);
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
  private resultToProduct(result: GetProductDto[]): ProductI[] {
    const mappedProducts: Map<number, ProductI> = new Map();
    result.forEach((record: GetProductDto) => {
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

        if (record.tagID) {
          product.tags.push({
            tagID: record.tagID,
            tagName: record.tagName,
            tagType: record.tagType,
          });
        }
      }
    });
    return Array.from(mappedProducts.values());
  }

  /**
   * Método para añadir los criterios de búsqueda a los filtros
   * @param filters - filtros
   * @param search - criterios de búsqueda
   * @returns filtros con criterios de búsqueda
   */
  private addSearchToFilters(filters: string, search: string): string {
    if (search) {
      filters += ` 
        AND (productName LIKE '%${search}%')
        `;
    }
    return filters;
  }
}
