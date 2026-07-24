import { Logger } from '@nestjs/common';
import { drizzle, type SqliteRemoteDatabase } from 'drizzle-orm/sqlite-proxy';
import * as schema from '@/db/schema';

export type HomeManagementDrizzleDb = SqliteRemoteDatabase<typeof schema>;

type SqliteStatementResult = {
    changes?: number | bigint;
    lastInsertRowid?: number | bigint;
};

type SqliteStatement = {
    all: (...params: unknown[]) => unknown[][];
    run: (...params: unknown[]) => SqliteStatementResult;
};

export type HomeManagementSqliteConnection = {
    prepare: (sql: string) => SqliteStatement;
    close: () => void;
};

const { DatabaseSync } = require('node:sqlite') as {
    DatabaseSync: new (databasePath: string) => HomeManagementSqliteConnection;
};

type SqliteRow = Record<string, unknown>;

const all = (
    connection: HomeManagementSqliteConnection,
    sql: string,
    params: unknown[],
): Promise<unknown[][]> => {
    const statement = connection.prepare(sql) as SqliteStatement & {
        setReturnArrays?: (enabled: boolean) => void;
    };
    statement.setReturnArrays?.(true);
    return Promise.resolve(statement.all(...params) ?? []);
};

const run = (
    connection: HomeManagementSqliteConnection,
    sql: string,
    params: unknown[],
): Promise<{ changes: number; lastInsertRowid: number | null }> => {
    const statement = connection.prepare(sql);
    const result = statement.run(...params);
    return Promise.resolve({
        changes: Number(result.changes ?? 0),
        lastInsertRowid:
            result.lastInsertRowid === undefined
                ? null
                : Number(result.lastInsertRowid),
    });
};

export const closeSqliteDatabase = (
    connection: HomeManagementSqliteConnection,
): Promise<void> => {
    connection.close();
    return Promise.resolve();
};

export const createSqliteConnection = async (
    databasePath: string,
    logger: Logger,
): Promise<HomeManagementSqliteConnection> => {
    const connection = new DatabaseSync(databasePath);
    logger.log(`Connected Drizzle SQLite datasource at ${databasePath}`);
    return connection;
};

export const createDrizzleDatabase = (
    connection: HomeManagementSqliteConnection,
): HomeManagementDrizzleDb => {
    return drizzle(
        async (sql, params, method) => {
            if (method === 'run') {
                const result = await run(connection, sql, params);
                return { rows: [result] };
            }

            const rows = await all(connection, sql, params);
            if (method === 'values') {
                return { rows };
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
