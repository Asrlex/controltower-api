import { Inject, Logger, NotFoundException } from '@nestjs/common';
import { DatabaseConnection } from 'src/db/database.connection';
import { SortI } from 'src/api/entities/interfaces/api.entity';
import { plainToInstance } from 'class-transformer';
import { TagRepository } from './tag.repository.interface';
import { TagI } from '@/api/home-management/entities/interfaces/home-management.entity';
import {
  CreateTagDto,
  GetTagDto,
} from '@/api/home-management/entities/dtos/tag.dto';
import { BaseRepository } from '@/common/repository/base-repository';
import { tagsQueries } from '@/db/queries/tags.queries';

export class TagRepositoryImplementation
  extends BaseRepository
  implements TagRepository
{
  constructor(
    @Inject('HOME_MANAGEMENT_CONNECTION')
    private readonly homeManagementDbConnection: DatabaseConnection,
    private readonly logger: Logger,
  ) {
    super(homeManagementDbConnection);
  }

  /**
   * Método para obtener todos las etiquetas
   * @returns string - todos las etiquetas
   */
  async findAll(): Promise<{
    entities: TagI[];
    total: number;
  }> {
    const sql = tagsQueries.findAll;
    const result = await this.homeManagementDbConnection.execute(sql);
    const entities: TagI[] = this.resultToTag(result);
    return {
      entities,
      total: result[0] ? parseInt(result[0].total, 10) : 0,
    };
  }

  /**
   * Método para obtener lista de etiquetas filtradas
   * @returns string - lista de etiquetas filtradas
   */
  async find(
    page: number,
    limit: number,
    searchCriteria: any,
  ): Promise<{ entities: TagI[]; total: number }> {
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
    const sql = tagsQueries.find
      .replaceAll('@DynamicWhereClause', filters)
      .replaceAll('@DynamicOrderByField', `${sort.field}`)
      .replaceAll('@DynamicOrderByDirection', `${sort.order}`)
      .replace('@start', offset.toString())
      .replace('@end', limit.toString());
    const result = await this.homeManagementDbConnection.execute(sql);
    const entities: TagI[] = this.resultToTag(result);
    return {
      entities,
      total: result[0] ? parseInt(result[0].total, 10) : 0,
    };
  }

  /**
   * Método para obtener un etiqueta por su id
   * @param id - id de la etiqueta
   * @returns string
   */
  async findById(id: string): Promise<TagI | null> {
    const sql = tagsQueries.findByID.replace('@id', id);
    const result = await this.homeManagementDbConnection.execute(sql);
    const entities: TagI[] = this.resultToTag(result);
    return entities.length > 0 ? entities[0] : null;
  }

  /**
   * Metodo para crear un nuevo etiqueta
   * @returns string - etiqueta creado
   */
  async create(dto: CreateTagDto): Promise<TagI> {
    dto = this.prepareDTO(dto);
    const sqlTag = tagsQueries.create.replace(
      '@InsertValues',
      `'${dto.tagName}', '${dto.tagType}'`,
    );
    const responseTag = await this.homeManagementDbConnection.execute(sqlTag);
    const tagID = responseTag[0].id;

    await this.saveLog('insert', 'tag', `Created tag ${tagID}`);
    return this.findById(tagID);
  }

  /**
   * Método para añadir una etiqueta a un item
   * @param tagID - id de la etiqueta
   * @param itemID - id del item
   * @returns void
   * @throws NotFoundException
   */
  async createItemTag(tagID: string, itemID: string): Promise<void> {
    const originalTag = await this.findById(tagID);
    if (!originalTag) {
      throw new NotFoundException('Tag not found');
    }

    let sql = '';
    if (originalTag.tagType === 'Product') {
      sql = tagsQueries.createProductTag;
    } else if (originalTag.tagType === 'Task') {
      sql = tagsQueries.createTaskTag;
    } else if (originalTag.tagType === 'Recipe') {
      sql = tagsQueries.createRecipeTag;
    } else {
      throw new NotFoundException('Tag type not found');
    }
    sql = sql.replace('@InsertValues', `'${itemID}', '${tagID}'`);
    await this.homeManagementDbConnection.execute(sql);
  }

  /**
   * Método para actualizar un etiqueta
   * Si la etiqueta no existe, se devuelve null
   * Si la etiqueta no tiene cambios, se devuelve la etiqueta original
   * @param id - id de la etiqueta
   * @param product - etiqueta
   * @returns string - etiqueta actualizado
   */
  async modify(id: string, dto: CreateTagDto): Promise<TagI> {
    const originalTag = await this.findById(id);
    if (!originalTag) {
      throw new NotFoundException('Tag not found');
    }
    dto = this.prepareDTO(dto);

    const sqlTag = tagsQueries.update
      .replace('@name', dto.tagName)
      .replace('@type', dto.tagType)
      .replace('@id', id);
    await this.homeManagementDbConnection.execute(sqlTag);

    await this.saveLog('update', 'tag', `Modified tag ${id}`);
    return this.findById(id);
  }

  /**
   * Método para eliminar un etiqueta
   * @param id - id de la etiqueta
   * @returns string - etiqueta eliminado
   */
  async delete(id: string): Promise<void> {
    const originalTag = await this.findById(id);
    if (!originalTag) {
      throw new NotFoundException('Tag not found');
    }
    const sql = tagsQueries.delete.replace('@id', id);
    await this.homeManagementDbConnection.execute(sql);
    await this.saveLog('delete', 'tag', `Deleted tag ${id}`);
  }

  /**
   * Método para eliminar una etiqueta de un item
   * @param tagID - id de la etiqueta
   * @param itemID - id del item
   * @returns null - etiqueta eliminado
   */
  async deleteItemTag(tagID: string, itemID: string) {
    console.log('deleteItemTag', tagID, itemID);
    const originalTag = await this.findById(tagID);
    if (!originalTag) {
      throw new NotFoundException('Tag not found');
    }

    let sql = '';
    let sqlID = '';
    if (originalTag.tagType === 'Product') {
      sql = tagsQueries.deleteProductTag;
      sqlID = 'product_id';
    } else if (originalTag.tagType === 'Task') {
      sql = tagsQueries.deleteTaskTag;
      sqlID = 'task_id';
    } else if (originalTag.tagType === 'Recipe') {
      sql = tagsQueries.deleteRecipeTag;
      sqlID = 'recipe_id';
    } else {
      throw new NotFoundException('Tag type not found');
    }
    sql = sql.replace(
      '@DeleteFields',
      `${sqlID} = '${itemID}' AND tag_id = '${tagID}'`,
    );
    await this.homeManagementDbConnection.execute(sql);
  }

  /**
   * Método para inicializar valores opcionales del DTO
   * @param dto - DTO
   * @returns DTO
   */
  private prepareDTO(dto: CreateTagDto): CreateTagDto {
    dto = plainToInstance(CreateTagDto, dto, {
      exposeDefaultValues: true,
    });
    return dto;
  }

  /**
   * Método para convertir el resultado de la consulta a un array de etiquetas
   * @param result - resultado de la consulta
   * @returns array de etiquetas
   */
  private resultToTag(result: GetTagDto[]): TagI[] {
    const mappedTag: Map<number, TagI> = new Map();
    result.forEach((record: GetTagDto) => {
      let tag: TagI;
      if (mappedTag.has(record.tagID)) {
        tag = mappedTag.get(record.tagID);
      } else {
        tag = {
          tagID: record.tagID,
          tagName: record.tagName,
          tagType: record.tagType,
        };
        mappedTag.set(record.tagID, tag);
      }
    });
    return Array.from(mappedTag.values());
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
        AND (tagName LIKE '%${search}%')
        `;
    }
    return filters;
  }
}
