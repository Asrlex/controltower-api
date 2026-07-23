/* eslint-disable @typescript-eslint/no-unused-vars */
import { Inject, Logger, NotFoundException } from '@nestjs/common';
import { count, eq } from 'drizzle-orm';
import {
  CreateUserDto,
} from '@/api/home-management/entities/dtos/user.dto';
import { UserI } from '@/api/home-management/entities/interfaces/home-management.entity';
import { UserRepository } from './user.repository.interface';
import { DRIZZLE_DB } from '@/db/drizzle/drizzle.constants';
import { HomeManagementDrizzleDb } from '@/db/drizzle/drizzle.client';
import { biometrics, users } from '@/db/schema';
import { saveLogWithDb } from '@/common/utils/repository.utils';

export class UserRepositoryImplementation
  implements UserRepository
{
  constructor(
    @Inject(DRIZZLE_DB)
    private readonly db: HomeManagementDrizzleDb,
    private readonly logger: Logger,
  ) {}

  /**
   * Método para obtener todos los usuarios
   * @returns string - todos los usuarios
   */
  async findAll(): Promise<{
    entities: any[];
    total: number;
  }> {
    const entities = await this.db
      .select({
        userID: users.id,
        userName: users.username,
        userEmail: users.email,
        userPassword: users.password,
        userDateCreated: users.createdAt,
        userLastModified: users.lastModifiedAt,
        userLastLogin: users.lastLoginAt,
      })
      .from(users);
    const [{ total }] = await this.db
      .select({ total: count(users.id) })
      .from(users);
    return {
      entities,
      total,
    };
  }

  /**
   * Método para obtener un usuario por su ID
   * @param id - ID del usuario
   * @returns string - usuario
   */
  async findById(id: string): Promise<UserI> {
    const result = await this.db
      .select({
        userID: users.id,
        userName: users.username,
        userEmail: users.email,
        userPassword: users.password,
        userDateCreated: users.createdAt,
        userLastModified: users.lastModifiedAt,
        userLastLogin: users.lastLoginAt,
      })
      .from(users)
      .where(eq(users.id, Number(id)))
      .limit(1);
    if (result.length === 0) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return result[0] ?? null;
  }

  /**
   * Método para obtener un usuario por su email
   * @param userEmail - email del usuario
   * @returns string - usuario
   */
  async findByEmail(userEmail: string): Promise<UserI> {
    const result = await this.db
      .select({
        userID: users.id,
        userName: users.username,
        userEmail: users.email,
        userPassword: users.password,
        userDateCreated: users.createdAt,
        userLastModified: users.lastModifiedAt,
        userLastLogin: users.lastLoginAt,
      })
      .from(users)
      .where(eq(users.email, userEmail))
      .limit(1);
    return result[0] ?? null;
  }

  /**
   * Método para crear un usuario
   * @param user - usuario a crear
   * @returns string - usuario creado
   */
  async create(dto: CreateUserDto): Promise<UserI> {
    const result = await this.db
      .insert(users)
      .values({
        email: dto.email,
        password: dto.password,
      })
      .returning({ id: users.id });
    const userID = result[0].id;

    await saveLogWithDb(this.db, 'user', `Created user ${userID}`);
    return this.findById(String(userID));
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
    await this.db
      .update(users)
      .set({
        email: dto.email,
        password: dto.password,
      })
      .where(eq(users.id, Number(id)));
    await saveLogWithDb(this.db, 'user', `Updated user ${id}`);
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
    await this.db.delete(users).where(eq(users.id, Number(id)));
    await saveLogWithDb(this.db, 'user', `Deleted user ${id}`);
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
    await this.db.insert(biometrics).values({
      userId: userID,
      credentialId: credentialID,
      credentialPublicKey: Buffer.from(credentialPublicKey),
    });
  }

  /**
   * Método para guardar el challenge de un usuario
   * @param userID - ID del usuario
   * @param challenge - challenge a guardar
   */
  async saveChallenge(userID: number, challenge: string): Promise<void> {
    await this.db
      .update(users)
      .set({ webauthnChallenge: challenge })
      .where(eq(users.id, userID));
  }

  /**
   * Método para obtener el challenge de un usuario
   * @param userID - ID del usuario
   * @returns string - challenge del usuario
   */
  async findChallenge(userID: number): Promise<string> {
    const result = await this.db
      .select({ challenge: users.webauthnChallenge })
      .from(users)
      .where(eq(users.id, userID))
      .limit(1);
    if (result.length === 0) {
      throw new NotFoundException(`User with ID ${userID} not found`);
    }
    return result[0].challenge;
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
    const result = await this.db
      .select({
        credentialID: biometrics.credentialId,
        credentialPublicKey: biometrics.credentialPublicKey,
        credentialCounter: biometrics.counter,
      })
      .from(biometrics)
      .where(eq(biometrics.userId, userID))
      .limit(1);
    if (result.length === 0) {
      throw new NotFoundException(`User with ID ${userID} not found`);
    }
    return {
      credentialID: result[0].credentialID,
      credentialPublicKey: result[0].credentialPublicKey,
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
    await this.db
      .update(biometrics)
      .set({ counter })
      .where(eq(biometrics.userId, userID));
  }

  find(
    page: number,
    limit: number,
    searchCriteria: any,
  ): Promise<{ entities: UserI[]; total: number }> {
    throw new Error('Method not implemented.');
  }
}
