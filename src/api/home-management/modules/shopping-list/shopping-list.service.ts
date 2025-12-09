import { CreateShoppingListProductDto } from '@/api/home-management/entities/dtos/shopping-list.dto';
import { SuccessCodes } from '@/api/entities/enums/response-codes.enum';
import { SearchCriteriaI } from '@/api/entities/interfaces/api.entity';
import {
  ShoppingListProductI,
  StockProductI,
} from '@/api/home-management/entities/interfaces/home-management.entity';
import { Inject, Injectable } from '@nestjs/common';
import {
  SHOPPING_LIST_PRODUCT_REPOSITORY,
  ShoppingListProductRepository,
} from './repository/shopping-list.repository.interface';

@Injectable()
export class ShoppingListProductService {
  constructor(
    @Inject(SHOPPING_LIST_PRODUCT_REPOSITORY)
    private readonly shoppingListProductRepository: ShoppingListProductRepository,
  ) {}

  /**
   * Método para verificar si el endpoint de productos esta funcionando
   * @returns string - mensaje indicando que el endpoint de productos esta funcionando
   */
  async status() {
    return {
      statusCode: SuccessCodes.Ok,
      message: 'Product endpoint is working',
    };
  }

  /**
   * Método para obtener todos los productos
   * @returns string - todos los productos
   */
  async findAllProducts(): Promise<{
    entities: ShoppingListProductI[];
    total: number;
  }> {
    return await this.shoppingListProductRepository.findAll();
  }

  /**
   * Método para obtener lista de productos filtrados
   * @returns string - lista de productos filtrados
   */
  async getProducts(
    page: number,
    limit: number,
    searchCriteria: SearchCriteriaI,
  ): Promise<{
    entities: ShoppingListProductI[];
    total: number;
  }> {
    return await this.shoppingListProductRepository.find(
      page,
      limit,
      searchCriteria,
    );
  }

  /**
   * Método para obtener un producto por su id
   * @param id - id del producto
   * @returns string
   */
  async getProductById(id: string): Promise<ShoppingListProductI> {
    return await this.shoppingListProductRepository.findById(id);
  }

  /**
   * Metodo para crear un nuevo producto
   * @returns string - producto creado
   */
  async createProduct(
    dto: CreateShoppingListProductDto,
  ): Promise<ShoppingListProductI> {
    return await this.shoppingListProductRepository.create(dto);
  }

  /**
   * Método para actualizar un producto
   * @param id - id del producto
   * @param customer - producto
   * @returns string - producto actualizado
   */
  async updateProduct(id: string, customer: CreateShoppingListProductDto) {
    return await this.shoppingListProductRepository.modify(id, customer);
  }

  /**
   * Método para comprar un producto
   * @param shoppingListProductID - id del producto
   * @returns string - producto comprado
   */
  async buyProduct(shoppingListProductID: string): Promise<StockProductI> {
    return await this.shoppingListProductRepository.buyProduct(
      shoppingListProductID,
    );
  }

  /**
   * Método para modificar la cantidad de un producto
   * @param productId - id del producto
   * @param amount - cantidad
   * @returns string - cantidad modificada
   */
  async modifyAmount(productId: string, amount: number): Promise<void> {
    return await this.shoppingListProductRepository.modifyAmount(
      productId,
      amount,
    );
  }

  /**
   * Método para eliminar un producto
   * @param id - id del producto
   * @returns null - producto eliminado
   */
  async deleteProduct(id: string) {
    await this.shoppingListProductRepository.delete(id);
  }
}
