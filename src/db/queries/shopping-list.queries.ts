import { formatTemplateString } from '@/common/utils/string-formatter';
import { baseQueries } from '../base-queries';
import { TableNames } from '../enums/db.enum';

// ******************************************************
// SHOPPING LIST
// ******************************************************
const shoppingListSelectRoot = `
  sl.id as shoppingListProductID,
  sl.amount as shoppingListAmount,
  p.id as productID,
  p.name as productName,
  p.unit as productUnit,
  p.last_bought_at as productDateLastBought,
  p.last_consumed_at as productDateLastConsumed,
  s.id as shopID,
  s.name as shopName,
  tg.id as tagID,
  tg.name as tagName,
  tg.type as tagType
`;
const KeyParam = 'shoppingListProductID';
const shoppingListJoin = `
  INNER JOIN products p ON p.id = sl.product_id
  INNER JOIN store s ON s.id = sl.store_id
  LEFT JOIN ${TableNames.ProductTags} pt ON pt.product_id = p.id
  LEFT JOIN ${TableNames.Tags} tg ON tg.id = pt.tag_id
`;
export const shoppingListQueries = {
  findAll: formatTemplateString(baseQueries.FindAll, {
    KeyParam,
    SelectFields: shoppingListSelectRoot,
    SelectTables: `${TableNames.ShoppingList} sl ${shoppingListJoin}`,
  }),
  findByID: formatTemplateString(baseQueries.FindById, {
    SelectFields: shoppingListSelectRoot,
    SelectTables: `${TableNames.ShoppingList} sl ${shoppingListJoin}`,
    SelectId: `sl.id`,
  }),
  find: formatTemplateString(baseQueries.Find, {
    KeyParam,
    IncludedItemsTable: `${TableNames.ShoppingList} sl ${shoppingListJoin}`,
    SelectFields: `${shoppingListSelectRoot}`,
    FilterJoins: `fr.shoppingListProductID = ai.shoppingListProductID`,
  }),
  create: formatTemplateString(baseQueries.Create, {
    InsertTable: TableNames.ShoppingList,
    InsertFields: 'amount, product_id, store_id',
    InsertOutput: 'RETURNING id',
  }),
  update: formatTemplateString(baseQueries.Update, {
    UpdateTable: TableNames.ShoppingList,
    UpdateFields: `amount = '@amount', product_id = '@product_id'`,
    UpdateId: 'id',
  }),
  modifyAmount: formatTemplateString(baseQueries.Update, {
    UpdateTable: TableNames.ShoppingList,
    UpdateFields: `amount = '@amount'`,
    UpdateId: 'id',
  }),
  delete: formatTemplateString(baseQueries.HardDelete, {
    DeleteTable: TableNames.ShoppingList,
  }),
};
