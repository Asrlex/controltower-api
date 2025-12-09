/* eslint-disable @typescript-eslint/no-unused-vars */
import { Inject, Logger, NotFoundException } from '@nestjs/common';
import { BaseRepository } from '../../../common/repository/base-repository';
import { DatabaseConnection } from '@/db/database.connection';
import {
  CreateUserDto,
  GetUserDto,
} from '@/api/entities/dtos/home-management/user.dto';
import { UserI } from '@/api/home-management/entities/interfaces/home-management.entity';
import { UserRepository } from './user.repository.interface';
import { usersQueries } from '@/db/queries/users.queries';

export class UserRepositoryImplementation
  extends BaseRepository
  implements UserRepository
{
  constructor(
    @Inject('HOME_MANAGEMENT_CONNECTION')
    private readonly homeManagementDbConnection: DatabaseConnection,
    private readonly logger: Logger,
  ) {
    super(homeManagementDbConnection);
  }

  /**
   * Método para obtener todos los usuarios
   * @returns string - todos los usuarios
   */
  async findAll(): Promise<{
    entities: any[];
    total: number;
  }> {
    const sql = usersQueries.findAll;
    const result = await this.homeManagementDbConnection.execute(sql);
    const entities: UserI[] = this.resultToUser(result);
    return {
      entities,
      total: result[0] ? parseInt(result[0].total, 10) : 0,
    };
  }

  /**
   * Método para obtener un usuario por su ID
   * @param id - ID del usuario
   * @returns string - usuario
   */
  async findById(id: string): Promise<UserI> {
    const sql = usersQueries.findByID.replace('@id', id);
    const result = await this.homeManagementDbConnection.execute(sql);
    if (result.length === 0) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    const entities: UserI[] = this.resultToUser(result);
    return entities.length > 0 ? entities[0] : null;
  }

  /**
   * Método para obtener un usuario por su email
   * @param userEmail - email del usuario
   * @returns string - usuario
   */
  async findByEmail(userEmail: string): Promise<UserI> {
    const sql = usersQueries.findByEmail;
    const result = await this.homeManagementDbConnection.execute(sql, [
      userEmail,
    ]);
    const entities: UserI[] = this.resultToUser(result);
    return entities.length > 0 ? entities[0] : null;
  }

  /**
   * Método para crear un usuario
   * @param user - usuario a crear
   * @returns string - usuario creado
   */
  async create(dto: CreateUserDto): Promise<UserI> {
    const sql = usersQueries.create.replace(
      '@InsertValues',
      `'${dto.email}', '${dto.password}'`,
    );
    const result = await this.homeManagementDbConnection.execute(sql);
    const userID = result[0].id;

    await this.saveLog('insert', 'user', `Created user ${userID}`);
    return this.findById(userID);
  }

  /**
   * Método para actualizar un usuario
   * @param user - usuario a actualizar
   * @returns string - usuario actualizado
   */
  async modify(id: string, dto: CreateUserDto): Promise<UserI> {
    const originalUser = await this.findById(id);
    if (!originalUser) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    const sql = usersQueries.update
      .replace('@userEmail', dto.email)
      .replace('@userPassword', dto.password);
    await this.homeManagementDbConnection.execute(sql);
    await this.saveLog('update', 'user', `Updated user ${id}`);
    return this.findById(id);
  }

  /**
   * Método para eliminar un usuario
   * @param id - ID del usuario a eliminar
   * @returns string - usuario eliminado
   */
  async delete(id: string): Promise<void> {
    const originalUser = await this.findById(id);
    if (!originalUser) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    const sql = usersQueries.delete.replace('@id', id);
    await this.homeManagementDbConnection.execute(sql);
    await this.saveLog('delete', 'user', `Deleted user ${id}`);
  }

  /**
   * Método para guardar las credenciales biométricas de un usuario
   * @param userID - ID del usuario
   * @param credentialID - ID de la credencial
   * @param credentialPublicKey - clave pública de la credencial
   */
  async saveBiometricCredential(
    userID: number,
    credentialID: string,
    credentialPublicKey: Uint8Array,
  ): Promise<void> {
    const sql = usersQueries.saveBiometricCredential.replace(
      '@InsertValues',
      `'${userID}', '${credentialID}', '${credentialPublicKey}'`,
    );
    await this.homeManagementDbConnection.execute(sql);
  }

  /**
   * Método para guardar el challenge de un usuario
   * @param userID - ID del usuario
   * @param challenge - challenge a guardar
   */
  async saveChallenge(userID: number, challenge: string): Promise<void> {
    const sql = usersQueries.saveChallenge
      .replace('@webauthn_challenge', challenge)
      .replace('@id', userID.toString());
    await this.homeManagementDbConnection.execute(sql);
  }

  /**
   * Método para obtener el challenge de un usuario
   * @param userID - ID del usuario
   * @returns string - challenge del usuario
   */
  async findChallenge(userID: number): Promise<string> {
    const sql = usersQueries.findChallenge.replace('@id', userID.toString());
    const result = await this.homeManagementDbConnection.execute(sql);
    if (result.length === 0) {
      throw new NotFoundException(`User with ID ${userID} not found`);
    }
    return result[0].webauthn_challenge;
  }

  /**
   * Método para obtener las credenciales biométricas de un usuario
   * @param userID - ID del usuario
   * @returns credenciales biométricas del usuario
   */
  async findCredentials(userID: number): Promise<{
    credentialID: string;
    credentialPublicKey: Uint8Array;
    credentialCounter: number;
  }> {
    const sql = usersQueries.findCredentials.replace('@id', userID.toString());
    const result = await this.homeManagementDbConnection.execute(sql);
    if (result.length === 0) {
      throw new NotFoundException(`User with ID ${userID} not found`);
    }
    return {
      credentialID: result[0].credentialID,
      credentialPublicKey: Buffer.from(result[0].credentialPublicKey, 'base64'),
      credentialCounter: result[0].credentialCounter,
    };
  }

  /**
   * Método para actualizar el contador de la credencial biométrica de un usuario
   * @param userID - ID del usuario
   * @param credentialID - ID de la credencial
   * @param counter - nuevo contador
   */
  async updateCredentialCounter(
    userID: number,
    counter: number,
  ): Promise<void> {
    const sql = usersQueries.updateCredentialCounter
      .replace('@id', userID.toString())
      .replace('@counter', counter.toString());
    await this.homeManagementDbConnection.execute(sql);
  }

  /**
   * Método para convertir el resultado de la consulta a un array de usuarios
   * @param result - resultado de la consulta
   * @returns array de usuarios
   */
  private resultToUser(result: GetUserDto[]): UserI[] {
    const users: UserI[] = result.map((record: GetUserDto) => {
      return {
        userID: record.userID,
        userName: record.userName,
        userEmail: record.userEmail,
        userPassword: record.userPassword,
        userDateCreated: record.userDateCreated,
        userLastModified: record.userDateModified,
        userLastLogin: record.userDateLastLogin,
      };
    });
    return users;
  }

  find(
    page: number,
    limit: number,
    searchCriteria: any,
  ): Promise<{ entities: UserI[]; total: number }> {
    throw new Error('Method not implemented.');
  }
}
