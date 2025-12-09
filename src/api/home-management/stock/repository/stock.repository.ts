import { forwardRef, Inject, Logger, NotFoundException } from '@nestjs/common';
import { DatabaseConnection } from 'src/db/database.connection';
import { SortI } from 'src/api/entities/interfaces/api.entity';
import { plainToInstance } from 'class-transformer';
import {
  ShoppingListProductI,
  StockProductI,
} from '@/api/home-management/entities/interfaces/home-management.entity';
import {
  CreateStockProductDto,
  GetStockProductDto,
} from '@/api/home-management/entities/dtos/stock-product.dto';
import { ShoppingListProductRepository } from '../../shopping-list/repository/shopping-list.repository.interface';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { BaseRepository } from '@/common/repository/base-repository';
import { StockProductRepository } from './stock.repository.interface';
import { stockProductQueries } from '@/db/queries/stock.queries';

export class StockProductRepositoryImplementation
  extends BaseRepository
  implements StockProductRepository
{
  constructor(
    @Inject('HOME_MANAGEMENT_CONNECTION')
    private readonly homeManagementDbConnection: DatabaseConnection,
    private readonly logger: Logger,
    @Inject(forwardRef(() => 'SHOPPING_LIST_PRODUCT_REPOSITORY'))
    protected readonly shoppingListProductRepository: ShoppingListProductRepository,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {
    super(homeManagementDbConnection);
  }

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
    const sql = stockProductQueries.findAll;
    const result = await this.homeManagementDbConnection.execute(sql);
    const entities: StockProductI[] = this.resultToProduct(result);
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
  ): Promise<{ entities: StockProductI[]; total: number }> {
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
    const sql = stockProductQueries.find
      .replaceAll('@DynamicWhereClause', filters)
      .replaceAll('@DynamicOrderByField', `${sort.field}`)
      .replaceAll('@DynamicOrderByDirection', `${sort.order}`)
      .replace('@start', offset.toString())
      .replace('@end', limit.toString());
    const result = await this.homeManagementDbConnection.execute(sql);
    const entities: StockProductI[] = this.resultToProduct(result);
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
  async findById(id: string): Promise<StockProductI | null> {
    const sql = stockProductQueries.findByID.replace('@id', id);
    const result = await this.homeManagementDbConnection.execute(sql);
    const entities: StockProductI[] = this.resultToProduct(result);
    return entities.length > 0 ? entities[0] : null;
  }

  /**
   * Metodo para crear un nuevo producto
   * @returns string - producto creado
   */
  async create(dto: CreateStockProductDto): Promise<StockProductI> {
    dto = this.prepareDTO(dto);
    const sqlProduct = stockProductQueries.create.replace(
      '@InsertValues',
      `'${dto.stockProductAmount}', '${dto.stockProductID}'`,
    );
    const responseProduct =
      await this.homeManagementDbConnection.execute(sqlProduct);
    const productID = responseProduct[0].id;
    const newStockProduct = await this.findById(productID);

    const stock: { entities: StockProductI[]; total: number } =
      await this.cacheManager.get('stock');
    if (stock) {
      stock.entities.push(newStockProduct);
      await this.cacheManager.set('stock', stock);
    }

    await this.saveLog('insert', 'product', `Created product ${productID}`);
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

    const sqlProduct = stockProductQueries.update
      .replace('@amount', dto.stockProductAmount.toString())
      .replace('@product_id', dto.stockProductID.toString())
      .replace('@id', id);
    await this.homeManagementDbConnection.execute(sqlProduct);

    await this.saveLog('update', 'product', `Modified product ${id}`);
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
    await this.saveLog(
      'update',
      'shopping_list',
      `Bought product ${stockProductID}`,
    );
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
    const sql = stockProductQueries.modifyAmount
      .replace('@amount', amount.toString())
      .replace('@id', productId);
    await this.homeManagementDbConnection.execute(sql);
    await this.saveLog(
      'update',
      'shopping_list',
      `Modified amount of product ${productId}`,
    );
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

    const stock: { entities: StockProductI[]; total: number } =
      await this.cacheManager.get('stock');
    if (stock) {
      const index = stock.entities.findIndex(
        (product) => product.stockProductID === Number(id),
      );
      if (index !== -1) {
        stock.entities.splice(index, 1);
        await this.cacheManager.set('stock', stock);
      }
    }

    const sql = stockProductQueries.delete.replace('@id', id);
    await this.homeManagementDbConnection.execute(sql);
    await this.saveLog('delete', 'product', `Deleted product ${id}`);
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
  private resultToProduct(result: GetStockProductDto[]): StockProductI[] {
    const mappedProducts: Map<number, StockProductI> = new Map();
    result.forEach((record: GetStockProductDto) => {
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

      if (record.tagID) {
        product.product.tags.push({
          tagID: record.tagID,
          tagName: record.tagName,
          tagType: record.tagType,
        });
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
