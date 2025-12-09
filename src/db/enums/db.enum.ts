export enum DBEnum {
  DateFunction = 'GETDATE()',
  InsertLog = 'insert',
  UpdateLog = 'update',
  DeleteLog = 'delete',
  Output = 'OUTPUT INSERTED.id',
  DeletedAt = 'deleted_at',
  Id = 'id',
}

export enum TableNames {
  Products = 'products',
  Pantry = 'pantry',
  Shops = 'store',
  ShoppingList = 'shopping_list',
  ProductTags = 'product_tag',
  Tags = 'tag',
  Tasks = 'task',
  HouseTasks = 'house_task',
  CarTasks = 'car_task',
  TaskTags = 'task_tag',
  Order = 'list_order',
  Recipes = 'recipe',
  RecipeTags = 'recipe_tag',
  RecipeIngredients = 'recipe_ingredient',
  RecipeSteps = 'recipe_step',
  Settings = 'settings',
  Shifts = 'shifts',
  Absences = 'absences',
  Users = 'user',
  Biometrics = 'biometrics',
  Expenses = 'expenses',
  ExpenseCategories = 'expense_category',
}

export enum BaseQueries {
  FindAll = `
    WITH UniqueValues AS (
      SELECT DISTINCT id
      FROM @KeyTable
    )
    SELECT
      ai.*,
      (SELECT COUNT(*) FROM UniqueValues) AS total
    FROM (
      select
        @SelectFields
      from @SelectTables
      WHERE @DeletedAt IS NULL
    ) ai
  `,
  Find = `
    WITH AliasItems AS (
      SELECT 
        @SelectFields
      FROM @IncludedItemsTable
    ),
    FilteredItems AS (
      SELECT 
        *
      FROM AliasItems
      WHERE @DynamicWhereClause
    ),
    IncludedItems AS (
      SELECT 
        @KeyParam,
        ROW_NUMBER() OVER (ORDER BY @DynamicOrderByField @DynamicOrderByDirection) as rn
      FROM (SELECT DISTINCT @KeyParam, @DynamicOrderByField FROM FilteredItems) as UniqueItems
    ),
    FilteredRows AS (
      SELECT @KeyParam
      FROM IncludedItems
      WHERE rn BETWEEN @start AND @end
    ),
    TotalItems AS (
      SELECT COUNT(DISTINCT @KeyParam) as total FROM FilteredItems
    )
    select
      ai.*,
      (SELECT total FROM TotalItems) as total
    FROM AliasItems ai
    INNER JOIN FilteredRows fr on @FilterJoins
    ORDER BY ai.@DynamicOrderByField @DynamicOrderByDirection
  `,
  FindById = `
    select
      @SelectFields
    from @SelectTables
    WHERE @SelectId = '@id'
  `,
  Create = `
    INSERT INTO @InsertTable (@InsertFields)
    @InsertOutput
    VALUES (@InsertValues)
  `,
  Modify = `
    UPDATE @UpdateTable
    SET @UpdateFields
    WHERE @UpdateId = '@id'
  `,
  SoftDelete = `
    UPDATE @DeleteTable
    SET deleted_at = GETDATE(), deleted_by = '@deletedBy'
    WHERE @DeleteId = '@id'
  `,
  HardDelete = `
    DELETE FROM @DeleteTable
    WHERE @DeleteId = '@id'
  `,
  CreateLog = `
    INSERT INTO MASTER.master_logs (table_name, changed_by, change_description)
    VALUES (@InsertValues)
  `,
}
