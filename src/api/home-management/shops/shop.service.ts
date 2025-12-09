import { CreateShopDto } from '@/api/home-management/entities/dtos/shop.dto';
import { SuccessCodes } from '@/api/entities/enums/response-codes.enum';
import { SearchCriteriaI } from '@/api/entities/interfaces/api.entity';
import { ShopI } from '@/api/home-management/entities/interfaces/home-management.entity';
import { Inject, Injectable } from '@nestjs/common';
import {
  SHOP_REPOSITORY,
  IShopRepository,
} from './repository/shop.repository.interface';

@Injectable()
export class ShopService {
  constructor(
    @Inject(SHOP_REPOSITORY)
    private readonly shopRepository: IShopRepository,
  ) {}

  /**
   * Método para verificar si el endpoint de tiendas esta funcionando
   * @returns string - mensaje indicando que el endpoint de tiendas esta funcionando
   */
  async status() {
    return {
      statusCode: SuccessCodes.Ok,
      message: 'Shops endpoint is working',
    };
  }

  /**
   * Método para obtener todos los tiendas
   * @returns string - todos los tiendas
   */
  async findAllShops(): Promise<{
    entities: ShopI[];
    total: number;
  }> {
    return await this.shopRepository.findAll();
  }

  /**
   * Método para obtener lista de tiendas filtrados
   * @returns string - lista de tiendas filtrados
   */
  async getShops(
    page: number,
    limit: number,
    searchCriteria: SearchCriteriaI,
  ): Promise<{
    entities: ShopI[];
    total: number;
  }> {
    return await this.shopRepository.find(page, limit, searchCriteria);
  }

  /**
   * Método para obtener una tienda por su id
   * @param id - id de la tienda
   * @returns string
   */
  async getShopById(id: string): Promise<ShopI> {
    return await this.shopRepository.findById(id);
  }

  /**
   * Metodo para crear un nuevo tienda
   * @returns string - tienda creado
   */
  async createShop(dto: CreateShopDto): Promise<ShopI> {
    return await this.shopRepository.create(dto);
  }

  /**
   * Método para actualizar una tienda
   * @param id - id de la tienda
   * @param customer - tienda
   * @returns string - tienda actualizado
   */
  async updateShop(id: string, customer: CreateShopDto) {
    return await this.shopRepository.modify(id, customer);
  }

  /**
   * Método para eliminar una tienda
   * @param id - id de la tienda
   * @returns null - tienda eliminado
   */
  async deleteShop(id: string) {
    await this.shopRepository.delete(id);
  }
}
