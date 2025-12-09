import { formatTemplateString } from '@/common/utils/string-formatter';
import { baseQueries } from '../base-queries';
import { TableNames } from '../enums/db.enum';

// ******************************************************
// SHOPS
// ******************************************************
const shopsSelectRoot = `
  s.id as shopID,
  s.name as shopName
`;
const KeyParam = 'shopID';
export const shopsQueries = {
  findAll: formatTemplateString(baseQueries.FindAll, {
    KeyParam,
    SelectFields: shopsSelectRoot,
    SelectTables: `${TableNames.Shops} s`,
  }),
  findByID: formatTemplateString(baseQueries.FindById, {
    SelectFields: shopsSelectRoot,
    SelectTables: `${TableNames.Shops} s`,
    SelectId: `s.id`,
  }),
  find: formatTemplateString(baseQueries.Find, {
    KeyParam,
    IncludedItemsTable: `${TableNames.Shops} s`,
    SelectFields: `${shopsSelectRoot}`,
    FilterJoins: `fr.shopID = ai.shopID`,
  }),
  create: formatTemplateString(baseQueries.Create, {
    InsertTable: TableNames.Shops,
    InsertFields: 'name',
    InsertOutput: 'RETURNING id',
  }),
  update: formatTemplateString(baseQueries.Update, {
    UpdateTable: TableNames.Shops,
    UpdateFields: `name = '@name'`,
    UpdateId: 'id',
  }),
  delete: formatTemplateString(baseQueries.HardDelete, {
    DeleteTable: TableNames.Shops,
  }),
};
