import { CreateTagDto } from '@/api/home-management/entities/dtos/tag.dto';
import { SuccessCodes } from '@/api/entities/enums/response-codes.enum';
import { SearchCriteriaI } from '@/api/entities/interfaces/api.entity';
import { TagI } from '@/api/home-management/entities/interfaces/home-management.entity';
import { Inject, Injectable } from '@nestjs/common';
import {
  TAG_REPOSITORY,
  TagRepository,
} from './repository/tag.repository.interface';

@Injectable()
export class TagService {
  constructor(
    @Inject(TAG_REPOSITORY)
    private readonly tagRepository: TagRepository,
  ) {}

  /**
   * Método para verificar si el endpoint de etiquetas esta funcionando
   * @returns string - mensaje indicando que el endpoint de etiquetas esta funcionando
   */
  async status() {
    return {
      statusCode: SuccessCodes.Ok,
      message: 'Tag endpoint is working',
    };
  }

  /**
   * Método para obtener todos las etiquetas
   * @returns string - todos las etiquetas
   */
  async findAllTags(): Promise<{
    entities: TagI[];
    total: number;
  }> {
    return await this.tagRepository.findAll();
  }

  /**
   * Método para obtener lista de etiquetas filtrados
   * @returns string - lista de etiquetas filtrados
   */
  async getTags(
    page: number,
    limit: number,
    searchCriteria: SearchCriteriaI,
  ): Promise<{
    entities: TagI[];
    total: number;
  }> {
    return await this.tagRepository.find(page, limit, searchCriteria);
  }

  /**
   * Método para obtener un etiqueta por su id
   * @param id - id del etiqueta
   * @returns string
   */
  async getTagById(id: string): Promise<TagI> {
    return await this.tagRepository.findById(id);
  }

  /**
   * Metodo para crear un nuevo etiqueta
   * @returns string - etiqueta creado
   */
  async createTag(dto: CreateTagDto): Promise<TagI> {
    return await this.tagRepository.create(dto);
  }

  /**
   * Método para añadir una etiqueta a un item
   * @param tagID - id de la etiqueta
   * @param itemID - id del item
   * @returns void
   * @throws NotFoundException
   */
  async createItemTag(tagID: string, itemID: string): Promise<void> {
    await this.tagRepository.createItemTag(tagID, itemID);
  }

  /**
   * Método para actualizar un etiqueta
   * @param id - id del etiqueta
   * @param customer - etiqueta
   * @returns string - etiqueta actualizado
   */
  async updateTag(id: string, customer: CreateTagDto) {
    return await this.tagRepository.modify(id, customer);
  }

  /**
   * Método para eliminar un etiqueta
   * @param id - id del etiqueta
   * @returns null - etiqueta eliminado
   */
  async deleteTag(id: string) {
    await this.tagRepository.delete(id);
  }

  /**
   * Método para eliminar una etiqueta de un item
   * @param tagID - id de la etiqueta
   * @param itemID - id del item
   * @returns null - etiqueta eliminado
   */
  async deleteItemTag(tagID: string, itemID: string) {
    await this.tagRepository.deleteItemTag(tagID, itemID);
  }
}
