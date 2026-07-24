import { CreateProductDto } from '@/api/home-management/entities/dtos/product.dto';
import { SuccessCodes } from '@/api/entities/enums/response-codes.enum';
import { SearchCriteriaI } from '@/api/entities/interfaces/api.entity';
import { ProductI } from '@/api/home-management/entities/interfaces/home-management.entity';
import { Inject, Injectable } from '@nestjs/common';
import {
    PRODUCT_REPOSITORY,
    ProductRepository,
} from './repository/products.repository.interface';

@Injectable()
export class ProductService {
    constructor(
        @Inject(PRODUCT_REPOSITORY)
        private readonly productRepository: ProductRepository,
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
        entities: ProductI[];
        total: number;
    }> {
        return await this.productRepository.findAll();
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
        entities: ProductI[];
        total: number;
    }> {
        return await this.productRepository.find(page, limit, searchCriteria);
    }

    /**
     * Método para obtener un producto por su id
     * @param id - id del producto
     * @returns string
     */
    async getProductById(id: string): Promise<ProductI> {
        return await this.productRepository.findById(id);
    }

    /**
     * Método para obtener orden de productos
     * @param type - tipo de orden
     * @returns string - orden de productos
     */
    async getOrderProducts(type: string): Promise<string[]> {
        return await this.productRepository.getOrderProducts(type);
    }

    /**
     * Método para crear un orden de productos
     * @param type - tipo de orden
     * @param order - orden de productos
     */
    async postOrderProducts(type: string, order: string[]): Promise<void> {
        await this.productRepository.postOrderProducts(type, order);
    }

    /**
     * Metodo para crear un nuevo producto
     * @returns string - producto creado
     */
    async createProduct(dto: CreateProductDto): Promise<ProductI> {
        return await this.productRepository.create(dto);
    }

    /**
     * Método para actualizar un producto
     * @param id - id del producto
     * @param customer - producto
     * @returns string - producto actualizado
     */
    async updateProduct(id: string, customer: CreateProductDto) {
        return await this.productRepository.modify(id, customer);
    }

    /**
     * Método para eliminar un producto
     * @param id - id del producto
     * @returns null - producto eliminado
     */
    async deleteProduct(id: string) {
        await this.productRepository.delete(id);
    }
}
