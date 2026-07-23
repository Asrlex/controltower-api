import { Logger } from '@nestjs/common';
import { drizzle, type SqliteRemoteDatabase } from 'drizzle-orm/sqlite-proxy';
import * as sqlite3 from 'sqlite3';
import * as schema from '@/db/schema';

export type HomeManagementDrizzleDb = SqliteRemoteDatabase<typeof schema>;

type SqliteRow = Record<string, unknown>;

const openSqliteDatabase = (databasePath: string): Promise<sqlite3.Database> => {
  return new Promise((resolve, reject) => {
    const connection = new sqlite3.Database(databasePath, (error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(connection);
    });
  });
};

const all = (
  connection: sqlite3.Database,
  sql: string,
  params: unknown[],
): Promise<SqliteRow[]> => {
  return new Promise((resolve, reject) => {
    connection.all(sql, params, (error, rows: SqliteRow[]) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(rows ?? []);
    });
  });
};

const run = (
  connection: sqlite3.Database,
  sql: string,
  params: unknown[],
): Promise<{ changes: number; lastInsertRowid: number | null }> => {
  return new Promise((resolve, reject) => {
    connection.run(sql, params, function onRun(error) {
      if (error) {
        reject(error);
        return;
      }
      resolve({
        changes: this.changes ?? 0,
        lastInsertRowid: this.lastID ?? null,
      });
    });
  });
};

export const closeSqliteDatabase = (
  connection: sqlite3.Database,
): Promise<void> => {
  return new Promise((resolve, reject) => {
    connection.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
};

export const createSqliteConnection = async (
  databasePath: string,
  logger: Logger,
): Promise<sqlite3.Database> => {
  const connection = await openSqliteDatabase(databasePath);
  logger.log(`Connected Drizzle SQLite datasource at ${databasePath}`);
  return connection;
};

export const createDrizzleDatabase = (
  connection: sqlite3.Database,
): HomeManagementDrizzleDb => {
  return drizzle(
    async (sql, params, method) => {
      if (method === 'run') {
        const result = await run(connection, sql, params);
        return { rows: [result] };
      }

      const rows = await all(connection, sql, params);
      if (method === 'values') {
        return {
          rows: rows.map((row) => Object.values(row)),
        };
      }
      if (method === 'get') {
        return {
          rows: rows[0] ? [rows[0]] : [],
        };
      }
      return { rows };
    },
    { schema },
  );
};