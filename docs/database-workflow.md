# Database Workflow

This project now has a consistent flow for seeding and incremental SQL migrations.

## Environment variables

- `DB_DIALECT`: `sqlite` or `postgres` (defaults to `sqlite`)
- `HOME_MANAGER_DATABASE`: SQLite file path (used when `DB_DIALECT=sqlite`)
- `DATABASE_URL`: Postgres connection string (used when `DB_DIALECT=postgres`)

## Commands

- `npm run db:migration:new -- <name>`
- `npm run db:migrate`
- `npm run db:migrate:sqlite`
- `npm run db:migrate:postgres`
- `npm run db:seed`
- `npm run db:seed:sqlite`
- `npm run db:seed:postgres`
- `npm run db:reset`
- `npm run db:reset:sqlite`
- `npm run db:reset:postgres`
- `npm run db:setup` (alias for SQLite setup)
- `npm run db:setup:sqlite` (Drizzle push + seed)
- `npm run db:setup:postgres` (migrate + seed)

Drizzle commands are still available:

- `npm run db:drizzle:generate`
- `npm run db:drizzle:introspect`
- `npm run db:drizzle:push`

## Incremental migration flow

1. Create migration file:
   - `npm run db:migration:new -- add_recipe_rating`
   - Optional scoped file:
     - `npm run db:migration:new -- add_pg_index --dialect=postgres`
     - `npm run db:migration:new -- add_sqlite_index --dialect=sqlite`
2. Add forward-only SQL in one of:
   - `src/db/migrations/common/*.sql`
   - `src/db/migrations/sqlite/*.sql`
   - `src/db/migrations/postgres/*.sql`
3. Apply pending migrations:
   - `npm run db:migrate:sqlite` or `npm run db:migrate:postgres`
4. Seed deterministic baseline data:
   - `npm run db:seed:sqlite` or `npm run db:seed:postgres`

## First-time setup

- SQLite: `npm run db:setup:sqlite`
- Postgres:
  1. Add at least one baseline migration file (schema creation) in `src/db/migrations/common` or `src/db/migrations/postgres`.
  2. Run `npm run db:setup:postgres`.

Migrations are tracked in `schema_migrations` and applied only once.

## Seed behavior (idempotent)

`db:seed` is deterministic and idempotent because it:

1. Clears seeded tables in FK-safe order.
2. Re-inserts canonical data from:
   - `src/db/seeders/products.sql`
   - `src/db/seeders/recipes.sql`

Running it repeatedly gives the same resulting dataset.

## Notes

- Current runtime repositories are implemented against your existing Drizzle SQLite schema setup.
- For production-grade Postgres runtime, create a dedicated Postgres Drizzle schema/module in code before switching the API runtime dialect.
- `db:drizzle:push` is best for bootstrap/sync. It can replace objects not declared in Drizzle schema (for example `schema_migrations`). Prefer `db:migrate:*` for incremental updates after bootstrap.
