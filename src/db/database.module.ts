import {
  Module,
  OnModuleDestroy,
  Inject,
  Logger,
} from '@nestjs/common';
import * as sqlite3 from 'sqlite3';
import {
  closeSqliteDatabase,
  createDrizzleDatabase,
  createSqliteConnection,
  type HomeManagementDrizzleDb,
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
      useFactory: (sqliteConnection: sqlite3.Database) => {
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
    private readonly drizzleSqliteConnection: sqlite3.Database,
    @Inject(DRIZZLE_DB)
    private readonly drizzleDb: HomeManagementDrizzleDb,
  ) {}

  async onModuleDestroy() {
    await closeSqliteDatabase(this.drizzleSqliteConnection);
  }
}
