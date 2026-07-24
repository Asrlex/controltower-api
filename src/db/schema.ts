import {
  blob,
  integer,
  real,
  sqliteTable,
  text,
} from 'drizzle-orm/sqlite-core';

export const logs = sqliteTable('logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  tableName: text('table_name').notNull(),
  changedBy: text('changed_by').notNull(),
  changeDescription: text('change_description').notNull(),
});

export const users = sqliteTable('user', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  username: text('username'),
  email: text('email').notNull(),
  password: text('password').notNull(),
  webauthnChallenge: text('webauthn_challenge'),
  createdAt: text('created_at'),
  lastModifiedAt: text('last_modified_at'),
  lastLoginAt: text('last_login_at'),
});

export const biometrics = sqliteTable('biometrics', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id),
  credentialId: text('credential_id').notNull(),
  credentialPublicKey: blob('credential_public_key', { mode: 'buffer' })
    .notNull(),
  counter: integer('counter').notNull().default(0),
});

export const expenseCategories = sqliteTable('expense_category', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
});

export const expenses = sqliteTable('expenses', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  amount: real('amount').notNull(),
  description: text('description').notNull(),
  date: text('date').notNull(),
  categoryId: integer('category_id')
    .notNull()
    .references(() => expenseCategories.id),
});

export const products = sqliteTable('products', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  unit: text('unit'),
  lastBoughtAt: text('last_bought_at'),
  lastConsumedAt: text('last_consumed_at'),
});

export const tags = sqliteTable('tag', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  type: text('type').notNull(),
});

export const productTags = sqliteTable('product_tag', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  productId: integer('product_id')
    .notNull()
    .references(() => products.id),
  tagId: integer('tag_id')
    .notNull()
    .references(() => tags.id),
});

export const pantry = sqliteTable('pantry', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  amount: real('amount').notNull(),
  productId: integer('product_id')
    .notNull()
    .references(() => products.id),
});

export const shops = sqliteTable('store', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
});

export const shoppingList = sqliteTable('shopping_list', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  amount: real('amount').notNull(),
  productId: integer('product_id')
    .notNull()
    .references(() => products.id),
  storeId: integer('store_id')
    .notNull()
    .references(() => shops.id),
});

export const listOrder = sqliteTable('list_order', {
  type: text('type').primaryKey(),
  listOrder: text('list_order').notNull(),
});

export const tasks = sqliteTable('task', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  description: text('description').notNull(),
  completed: integer('completed', { mode: 'boolean' }).default(false),
  completedAt: text('completed_at'),
  createdAt: text('created_at'),
  lastModifiedAt: text('last_modified_at'),
});

export const taskTags = sqliteTable('task_tag', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  taskId: integer('task_id')
    .notNull()
    .references(() => tasks.id),
  tagId: integer('tag_id')
    .notNull()
    .references(() => tags.id),
});

export const houseTasks = sqliteTable('house_task', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  date: text('date'),
});

export const carTasks = sqliteTable('car_task', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  details: text('details'),
  cost: real('cost'),
  date: text('date'),
});

export const recipes = sqliteTable('recipe', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  description: text('description').notNull(),
});

export const recipeTags = sqliteTable('recipe_tag', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  recipeId: integer('recipe_id')
    .notNull()
    .references(() => recipes.id),
  tagId: integer('tag_id')
    .notNull()
    .references(() => tags.id),
});

export const recipeIngredients = sqliteTable('recipe_ingredient', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  recipeId: integer('recipe_id')
    .notNull()
    .references(() => recipes.id),
  productId: integer('product_id')
    .notNull()
    .references(() => products.id),
  amount: real('amount').notNull(),
  unit: text('unit').notNull(),
  optional: integer('optional', { mode: 'boolean' }).default(false),
});

export const recipeSteps = sqliteTable('recipe_step', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  recipeId: integer('recipe_id')
    .notNull()
    .references(() => recipes.id),
  name: text('name').notNull(),
  description: text('description').notNull(),
  stepOrder: integer('step_order').notNull(),
  optional: integer('optional', { mode: 'boolean' }).default(false),
});

export const settings = sqliteTable('settings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  settings: text('settings').notNull(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id),
  createdAt: text('created_at'),
  lastModifiedAt: text('last_modified_at'),
});

export const shifts = sqliteTable('shifts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  date: text('date').notNull(),
  timestamp: text('timestamp').notNull(),
  type: text('type').notNull(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id),
});

export const absences = sqliteTable('absences', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  date: text('date').notNull(),
  type: text('type').notNull(),
  hours: real('hours').notNull(),
  comment: text('comment'),
  userId: integer('user_id').references(() => users.id),
});