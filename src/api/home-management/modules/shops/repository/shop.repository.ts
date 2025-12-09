import { Inject, Logger, NotFoundException } from '@nestjs/common';
import { DatabaseConnection } from 'src/db/database.connection';
import { SortI } from 'src/api/entities/interfaces/api.entity';
import { plainToInstance } from 'class-transformer';
import {
  CreateShopDto,
  GetShopDto,
} from '@/api/home-management/entities/dtos/shop.dto';
import { ShopI } from '@/api/home-management/entities/interfaces/home-management.entity';
import { BaseRepository } from '@/common/repository/base-repository';
import { IShopRepository } from './shop.repository.interface';
import { shopsQueries } from '@/db/queries/shops.queries';

export class ShopRepositoryImplementation
  extends BaseRepository
  implements IShopRepository
{
  constructor(
    @Inject('HOME_MANAGEMENT_CONNECTION')
    private readonly homeManagementDbConnection: DatabaseConnection,
    private readonly logger: Logger,
  ) {
    super(homeManagementDbConnection);
  }

  /**
   * Método para obtener todos las tiendas
   * @returns string - todos las tiendas
   */
  async findAll(): Promise<{
    entities: ShopI[];
    total: number;
  }> {
    const sql = shopsQueries.findAll;
    const result = await this.homeManagementDbConnection.execute(sql);
    const entities: ShopI[] = this.resultToShop(result);
    return {
      entities,
      total: result[0] ? parseInt(result[0].total, 10) : 0,
    };
  }

  /**
   * Método para obtener lista de tiendas filtradas
   * @returns string - lista de tiendas filtradas
   */
  async find(
    page: number,
    limit: number,
    searchCriteria: any,
  ): Promise<{ entities: ShopI[]; total: number }> {
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
    const sql = shopsQueries.find
      .replaceAll('@DynamicWhereClause', filters)
      .replaceAll('@DynamicOrderByField', `${sort.field}`)
      .replaceAll('@DynamicOrderByDirection', `${sort.order}`)
      .replace('@start', offset.toString())
      .replace('@end', limit.toString());
    const result = await this.homeManagementDbConnection.execute(sql);
    const entities: ShopI[] = this.resultToShop(result);
    return {
      entities,
      total: result[0] ? parseInt(result[0].total, 10) : 0,
    };
  }

  /**
   * Método para obtener un tiendas por su id
   * @param id - id del tiendas
   * @returns string
   */
  async findById(id: string): Promise<ShopI | null> {
    const sql = shopsQueries.findByID.replace('@id', id);
    const result = await this.homeManagementDbConnection.execute(sql);
    const entities: ShopI[] = this.resultToShop(result);
    return entities.length > 0 ? entities[0] : null;
  }

  /**
   * Metodo para crear un nuevo tiendas
   * @returns string - tiendas creado
   */
  async create(dto: CreateShopDto): Promise<ShopI> {
    dto = this.prepareDTO(dto);
    const sqlProduct = shopsQueries.create.replace(
      '@InsertValues',
      `'${dto.shopName}'`,
    );
    const responseProduct =
      await this.homeManagementDbConnection.execute(sqlProduct);
    const shopID = responseProduct[0].id;

    await this.saveLog('insert', 'shop', `Created shop ${shopID}`);
    return this.findById(shopID);
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

    const sqlProduct = shopsQueries.update
      .replace('@name', dto.shopName)
      .replace('@id', id);
    await this.homeManagementDbConnection.execute(sqlProduct);

    await this.saveLog('update', 'shop', `Modified shop ${id}`);
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
    const sql = shopsQueries.delete.replace('@id', id);
    await this.homeManagementDbConnection.execute(sql);
    await this.saveLog('delete', 'shop', `Deleted shop ${id}`);
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
  private resultToShop(result: GetShopDto[]): ShopI[] {
    const mappedShops: Map<number, ShopI> = new Map();
    result.forEach((record: GetShopDto) => {
      let shop: ShopI;
      if (mappedShops.has(record.shopID)) {
        shop = mappedShops.get(record.shopID);
      } else {
        shop = {
          shopID: record.shopID,
          shopName: record.shopName,
        };
        mappedShops.set(record.shopID, shop);
      }
    });
    return Array.from(mappedShops.values());
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
        AND (shopName LIKE '%${search}%')
        `;
    }
    return filters;
  }
}
