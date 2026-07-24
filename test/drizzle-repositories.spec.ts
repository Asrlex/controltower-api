import { Logger } from '@nestjs/common';
import { drizzle } from 'drizzle-orm/sqlite-proxy';
import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import { ProductRepositoryImplementation } from '@/api/home-management/modules/products/repository/products.repository';
import { ShoppingListProductRepositoryImplementation } from '@/api/home-management/modules/shopping-list/repository/shopping-list.repository';
import { StockProductRepositoryImplementation } from '@/api/home-management/modules/stock/repository/stock.repository';
import { TaskRepositoryImplementation } from '@/api/home-management/modules/tasks/repository/task.repository';
import { RecipeRepositoryImplementation } from '@/api/home-management/modules/recipes/repository/recipes.repository';
import * as schema from '@/db/schema';

type CacheValue = unknown;

class MemoryCache {
  private readonly values = new Map<string, CacheValue>();

  async get<T>(key: string): Promise<T | undefined> {
    return this.values.get(key) as T | undefined;
  }

  async set(key: string, value: CacheValue): Promise<void> {
    this.values.set(key, value);
  }

  async del(key: string): Promise<void> {
    this.values.delete(key);
  }
}

const runSql = async (connection: SqlJsDatabase, statement: string): Promise<void> => {
  connection.run(statement);
};

const createTestDatabase = async () => {
  const SQL = await initSqlJs();
  const sqlite = new SQL.Database();
  const db = drizzle(
    async (statement, params, method) => {
      if (method === 'run') {
        const prepared = sqlite.prepare(statement, params as any[]);
        const rows: any[] = [];
        while (prepared.step()) {
          rows.push(prepared.getAsObject());
        }
        prepared.free();
        const lastInsertResult = sqlite.exec('SELECT last_insert_rowid() as id');
        const lastInsertRowid =
          lastInsertResult[0]?.values?.[0]?.[0] !== undefined
            ? Number(lastInsertResult[0].values[0][0])
            : null;
        return {
          rows:
            rows.length > 0
              ? rows
              : [{ changes: sqlite.getRowsModified(), lastInsertRowid }],
        };
      }

      const prepared = sqlite.prepare(statement, params as any[]);
      const rows: any[] = [];
      while (prepared.step()) {
        rows.push(method === 'values' ? prepared.get() : prepared.getAsObject());
      }
      prepared.free();

      if (method === 'get') {
        return { rows: rows[0] ? [rows[0]] : [] };
      }
      return { rows };
    },
    { schema },
  );

  return { sqlite, db };
};

const createSchema = async (connection: any): Promise<void> => {
  const statements = [
    `CREATE TABLE logs (id INTEGER PRIMARY KEY AUTOINCREMENT, table_name TEXT NOT NULL, changed_by TEXT NOT NULL, change_description TEXT NOT NULL);`,
    `CREATE TABLE products (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, unit TEXT, last_bought_at TEXT, last_consumed_at TEXT);`,
    `CREATE TABLE tag (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, type TEXT NOT NULL);`,
    `CREATE TABLE product_tag (id INTEGER PRIMARY KEY AUTOINCREMENT, product_id INTEGER NOT NULL, tag_id INTEGER NOT NULL);`,
    `CREATE TABLE store (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL);`,
    `CREATE TABLE shopping_list (id INTEGER PRIMARY KEY AUTOINCREMENT, amount REAL NOT NULL, product_id INTEGER NOT NULL, store_id INTEGER NOT NULL);`,
    `CREATE TABLE pantry (id INTEGER PRIMARY KEY AUTOINCREMENT, amount REAL NOT NULL, product_id INTEGER NOT NULL);`,
    `CREATE TABLE list_order (type TEXT PRIMARY KEY, list_order TEXT NOT NULL);`,
    `CREATE TABLE task (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, description TEXT NOT NULL, completed INTEGER DEFAULT 0, completed_at TEXT, created_at TEXT, last_modified_at TEXT);`,
    `CREATE TABLE task_tag (id INTEGER PRIMARY KEY AUTOINCREMENT, task_id INTEGER NOT NULL, tag_id INTEGER NOT NULL);`,
    `CREATE TABLE recipe (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, description TEXT NOT NULL);`,
    `CREATE TABLE recipe_ingredient (id INTEGER PRIMARY KEY AUTOINCREMENT, recipe_id INTEGER NOT NULL, product_id INTEGER NOT NULL, amount REAL NOT NULL, unit TEXT NOT NULL, optional INTEGER DEFAULT 0);`,
    `CREATE TABLE recipe_step (id INTEGER PRIMARY KEY AUTOINCREMENT, recipe_id INTEGER NOT NULL, name TEXT NOT NULL, description TEXT NOT NULL, step_order INTEGER NOT NULL, optional INTEGER DEFAULT 0);`,
    `CREATE TABLE recipe_tag (id INTEGER PRIMARY KEY AUTOINCREMENT, recipe_id INTEGER NOT NULL, tag_id INTEGER NOT NULL);`,
  ];

  for (const statement of statements) {
    await runSql(connection, statement);
  }
};

describe.skip('Drizzle repositories', () => {
  let connection: SqlJsDatabase;
  let db: any;
  let cache: MemoryCache;
  let logger: Logger;

  beforeEach(async () => {
    logger = new Logger('drizzle-test');
    const testDatabase = await createTestDatabase();
    connection = testDatabase.sqlite;
    db = testDatabase.db;
    await createSchema(connection);
    cache = new MemoryCache();
  });

  afterEach(async () => {
    connection.close();
  });

  it('aggregates product tags and persists list ordering', async () => {
    const productRepo = new ProductRepositoryImplementation(db, logger, cache as any);

    await runSql(connection, `INSERT INTO products (name, unit) VALUES ('Milk', 'liters');`);

    await runSql(connection, `INSERT INTO tag (name, type) VALUES ('Dairy', 'Product');`);
    await runSql(connection, `INSERT INTO tag (name, type) VALUES ('Cold', 'Product');`);
    await runSql(connection, `INSERT INTO product_tag (product_id, tag_id) VALUES (1, 1);`);
    await runSql(connection, `INSERT INTO product_tag (product_id, tag_id) VALUES (1, 2);`);

    const allProducts = await productRepo.findAll();
    expect(allProducts.total).toBe(1);
    expect(allProducts.entities[0].tags).toHaveLength(2);

    await productRepo.postOrderProducts('weekly', ['1']);
    await expect(productRepo.getOrderProducts('weekly')).resolves.toEqual([
      '1',
    ]);
  });

  it('moves stock items into shopping list through the repository flow', async () => {
    const productRepo = new ProductRepositoryImplementation(db, logger, cache as any);
    const stockRepo = new StockProductRepositoryImplementation(
      db,
      logger,
      {} as any,
      cache as any,
    );
    const shoppingRepo = new ShoppingListProductRepositoryImplementation(
      db,
      logger,
      stockRepo as any,
      cache as any,
    );
    (stockRepo as any).shoppingListProductRepository = shoppingRepo;

    await runSql(connection, `INSERT INTO store (name) VALUES ('Default shop');`);
    await runSql(connection, `INSERT INTO products (name, unit) VALUES ('Rice', 'kg');`);
    await runSql(connection, `INSERT INTO pantry (amount, product_id) VALUES (3, 1);`);

    const shoppingItem = await stockRepo.addProductToShoppingList(
      '1',
    );

    expect(shoppingItem.shoppingListProductAmount).toBe(3);
    await expect(stockRepo.findAll()).resolves.toMatchObject({ total: 0 });
    await expect(shoppingRepo.findAll()).resolves.toMatchObject({ total: 1 });
  });

  it('toggles task completion and stamps completion time', async () => {
    const taskRepo = new TaskRepositoryImplementation(db, logger);

    await runSql(
      connection,
      `INSERT INTO task (title, description, completed) VALUES ('Test task', 'Needs to be completed', 0);`,
    );

    const completedTask = await taskRepo.toggleCompletedTask(
      '1',
      true,
    );

    expect(completedTask.taskCompleted).toBe(true);
    expect(completedTask.taskCompletedAt).toBeTruthy();
  });

  it('aggregates and updates nested recipe ingredients and steps', async () => {
    const recipeRepo = new RecipeRepositoryImplementation(db, logger, cache as any);

    await runSql(connection, `INSERT INTO products (name, unit) VALUES ('Tomato', 'pcs');`);
    await runSql(connection, `INSERT INTO recipe (name, description) VALUES ('Soup', 'Simple soup');`);
    await runSql(connection, `INSERT INTO recipe_ingredient (recipe_id, product_id, amount, unit, optional) VALUES (1, 1, 2, 'pcs', 0);`);
    await runSql(connection, `INSERT INTO recipe_step (recipe_id, name, description, step_order, optional) VALUES (1, 'Chop', 'Chop tomatoes', 1, 0);`);

    const recipe = await recipeRepo.findById('1');

    expect(recipe.ingredients).toHaveLength(1);
    expect(recipe.steps).toHaveLength(1);

    const updatedRecipe = await recipeRepo.modify('1', {
      recipeID: 1,
      recipeName: 'Soup+',
      recipeDescription: 'Simple soup updated',
      ingredients: [
        {
          recipeIngredientID: recipe.ingredients[0].recipeIngredientID,
          recipeID: 1,
          product: {
            productID: 1,
            productName: 'Tomato',
          },
          recipeIngredientAmount: 3,
          recipeIngredientUnit: 'pcs',
          recipeIngredientIsOptional: true,
        },
      ],
      steps: [
        {
          recipeStepID: recipe.steps[0].recipeStepID,
          recipeID: 1,
          recipeStepName: 'Cook',
          recipeStepDescription: 'Cook tomatoes',
          recipeStepOrder: 1,
          recipeStepIsOptional: false,
        },
      ],
    });

    expect(updatedRecipe.recipeName).toBe('Soup+');
    expect(updatedRecipe.ingredients[0].recipeIngredientAmount).toBe(3);
    expect(updatedRecipe.ingredients[0].recipeIngredientIsOptional).toBe(true);
    expect(updatedRecipe.steps[0].recipeStepName).toBe('Cook');
  });
});