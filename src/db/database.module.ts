import { Module, OnModuleDestroy, Inject, Logger } from '@nestjs/common';
import {
    closeSqliteDatabase,
    createDrizzleDatabase,
    createSqliteConnection,
    type HomeManagementDrizzleDb,
    type HomeManagementSqliteConnection,
} from './drizzle/drizzle.client';
import {
    DRIZZLE_DB,
    DRIZZLE_SQLITE_CONNECTION,
} from './drizzle/drizzle.constants';

@Module({
    providers: [
        {
            provide: DRIZZLE_SQLITE_CONNECTION,
            useFactory: async (logger: Logger) => {
                return createSqliteConnection(
                    process.env.HOME_MANAGER_DATABASE,
                    logger,
                );
            },
            inject: [Logger],
        },
        {
            provide: DRIZZLE_DB,
            useFactory: (sqliteConnection: HomeManagementSqliteConnection) => {
                return createDrizzleDatabase(sqliteConnection);
            },
            inject: [DRIZZLE_SQLITE_CONNECTION],
        },
        Logger,
    ],
    exports: [DRIZZLE_DB],
})
export class DatabaseModule implements OnModuleDestroy {
    constructor(
        @Inject(DRIZZLE_SQLITE_CONNECTION)
        private readonly drizzleSqliteConnection: HomeManagementSqliteConnection,
        @Inject(DRIZZLE_DB)
        private readonly drizzleDb: HomeManagementDrizzleDb,
    ) {}

    async onModuleDestroy() {
        await closeSqliteDatabase(this.drizzleSqliteConnection);
    }
}
