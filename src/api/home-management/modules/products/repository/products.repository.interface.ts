import { GenericRepository } from '@/common/repository/generic-repository.interface';
import { ProductI } from '@/api/home-management/entities/interfaces/home-management.entity';
import { CreateProductDto } from '@/api/home-management/entities/dtos/product.dto';

export const PRODUCT_REPOSITORY = 'PRODUCT_REPOSITORY';

export interface ProductRepository extends GenericRepository<
    ProductI,
    string,
    CreateProductDto
> {
    getOrderProducts(type: string): Promise<string[]>;
    postOrderProducts(type: string, order: string[]): Promise<void>;
}
