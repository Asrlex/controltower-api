import { forwardRef, Inject, Logger, NotFoundException } from '@nestjs/common';
import { DatabaseConnection } from 'src/db/database.connection';
import { SortI } from 'src/api/entities/interfaces/api.entity';
import { plainToInstance } from 'class-transformer';
import {
  ShoppingListProductI,
  StockProductI,
} from '@/api/home-management/entities/interfaces/home-management.entity';
import {
  CreateShoppingListProductDto,
  GetShoppingListProductDto,
} from '@/api/entities/dtos/home-management/shopping-list.dto';
import { StockProductRepository } from '../../stock/repository/stock.repository.interface';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { ShoppingListProductRepository } from './shopping-list.repository.interface';
import { BaseRepository } from '@/common/repository/base-repository';
import { shoppingListQueries } from '@/db/queries/shopping-list.queries';

export class ShoppingListProductRepositoryImplementation
  extends BaseRepository
  implements ShoppingListProductRepository
{
  constructor(
    @Inject('HOME_MANAGEMENT_CONNECTION')
    private readonly homeManagementDbConnection: DatabaseConnection,
    private readonly logger: Logger,
    @Inject(forwardRef(() => 'STOCK_PRODUCT_REPOSITORY'))
    protected readonly stockProductRepository: StockProductRepository,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {
    super(homeManagementDbConnection);
  }

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
    const sql = shoppingListQueries.findAll;
    const result = await this.homeManagementDbConnection.execute(sql);
    const entities: ShoppingListProductI[] = this.resultToProduct(result);
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
  ): Promise<{ entities: ShoppingListProductI[]; total: number }> {
    let filters = '';
    let sort: SortI = { field: 'customerName', order: 'DESC' };
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
    const sql = shoppingListQueries.find
      .replaceAll('@DynamicWhereClause', filters)
      .replaceAll('@DynamicOrderByField', `${sort.field}`)
      .replaceAll('@DynamicOrderByDirection', `${sort.order}`)
      .replace('@start', offset.toString())
      .replace('@end', limit.toString());
    const result = await this.homeManagementDbConnection.execute(sql);
    const entities: ShoppingListProductI[] = this.resultToProduct(result);
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
  async findById(id: string): Promise<ShoppingListProductI | null> {
    const sql = shoppingListQueries.findByID.replace('@id', id);
    const result = await this.homeManagementDbConnection.execute(sql);
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
    const sqlProduct = shoppingListQueries.create.replace(
      '@InsertValues',
      `'${dto.shoppingListAmount}', '${dto.shoppingListProductID}', '${dto.shopID}'`,
    );

    const responseProduct =
      await this.homeManagementDbConnection.execute(sqlProduct);
    const productID = responseProduct[0].id;
    const newShoppingListProduct = await this.findById(productID);

    const shoppingList: {
      entities: ShoppingListProductI[];
      total: number;
    } = await this.cacheManager.get('shopping-list');
    if (shoppingList) {
      shoppingList.entities.push(newShoppingListProduct);
      shoppingList.total += 1;
      await this.cacheManager.set('shopping-list', shoppingList);
    }

    await this.saveLog(
      'insert',
      'shopping_list',
      `Created product ${productID}`,
    );
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

    const sqlProduct = shoppingListQueries.update
      .replace('@amount', dto.shoppingListAmount.toString())
      .replace('@product_id', dto.shoppingListProductID.toString())
      .replace('@id', id);
    await this.homeManagementDbConnection.execute(sqlProduct);
    const editedProduct = await this.findById(id);

    const shoppingList: {
      entities: ShoppingListProductI[];
      total: number;
    } = await this.cacheManager.get('shopping-list');
    if (shoppingList) {
      const index = shoppingList.entities.findIndex(
        (p: ShoppingListProductI) => p.shoppingListProductID.toString() === id,
      );
      shoppingList.entities[index] = editedProduct;
      await this.cacheManager.set('shopping-list', shoppingList);
    }

    await this.saveLog('update', 'shopping_list', `Modified product ${id}`);
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

    console.log(originalProduct);
    await this.delete(shoppingListProductID);
    const response = await this.stockProductRepository.create({
      stockProductID: originalProduct.product.productID,
      stockProductAmount: originalProduct.shoppingListProductAmount,
    });
    await this.saveLog(
      'update',
      'shopping_list',
      `Bought product ${shoppingListProductID}`,
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
    const sql = shoppingListQueries.modifyAmount
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
    const sql = shoppingListQueries.delete.replace('@id', id);
    await this.homeManagementDbConnection.execute(sql);

    const shoppingList: {
      entities: ShoppingListProductI[];
      total: number;
    } = await this.cacheManager.get('shopping-list');
    if (shoppingList) {
      const index = shoppingList.entities.findIndex(
        (p: ShoppingListProductI) => p.shoppingListProductID.toString() === id,
      );
      shoppingList.entities.splice(index, 1);
      shoppingList.total -= 1;
      await this.cacheManager.set('shopping-list', shoppingList);
    }

    await this.saveLog('delete', 'shopping_list', `Deleted product ${id}`);
  }

  /**
   * Método para inicializar valores opcionales del DTO
   * @param dto - DTO
   * @returns DTO
   */
  private prepareDTO(
    dto: CreateShoppingListProductDto,
  ): CreateShoppingListProductDto {
    dto = plainToInstance(CreateShoppingListProductDto, dto, {
      exposeDefaultValues: true,
    });
    return dto;
  }

  /**
   * Método para convertir el resultado de la consulta a un array de productos
   * @param result - resultado de la consulta
   * @returns array de productos
   */
  private resultToProduct(
    result: GetShoppingListProductDto[],
  ): ShoppingListProductI[] {
    const mappedProducts: Map<number, ShoppingListProductI> = new Map();
    result.forEach((record: GetShoppingListProductDto) => {
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
