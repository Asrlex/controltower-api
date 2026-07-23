import {
  SearchCriteriaI,
  SortI,
  FilterI,
} from 'src/api/entities/interfaces/api.entity';
import { EscapingException } from 'src/common/exceptions/escaping.exception';
import { HomeManagementDrizzleDb } from '@/db/drizzle/drizzle.client';
import { logs } from '@/db/schema';

export const saveLogWithDb = async (
  db: HomeManagementDrizzleDb,
  table: string,
  description: string,
): Promise<void> => {
  await db.insert(logs).values({
    tableName: table,
    changedBy: 'system',
    changeDescription: description,
  });
};

export const denullifyDto = <T extends Record<string, any>>(dto: T): T => {
  const mutableDto = dto as Record<string, any>;
  Object.keys(mutableDto).forEach((key) => {
    if (mutableDto[key] === null) {
      mutableDto[key] = '';
    }
  });
  return dto;
};

export const filtersToSql = (
  searchCriteria: SearchCriteriaI,
): {
  filters: string;
  sort: SortI;
} => {
  let { filters, search, sort } = searchCriteria;
  try {
    const escapeSql = (value: string, operator: string) => {
      if (operator.toLowerCase() === 'in') {
        return value.replace(/'/g, "''").replace(/''/g, "'");
      }
      return value.replace(/'/g, "''");
    };
    if (filters) {
      filters = filters.map((filter: FilterI) => ({
        ...filter,
        value: escapeSql(filter.value, filter.operator),
      }));
    }
    if (search) {
      search = escapeSql(search, 'like');
    }
    if (sort) {
      sort = sort.map((value: SortI) => ({
        ...value,
        field: escapeSql(value.field, 'like'),
      }));
    }
  } catch (error) {
    throw new EscapingException('Error escaping filter values');
  }

  let sqlFilters = '1=1';
  if (filters) {
    filters.forEach((filter: FilterI) => {
      const operator = filter.operator.toLowerCase();
      if (operator === 'in') {
        sqlFilters += ` AND ${filter.field} ${filter.operator} ${filter.value}`;
      } else if (operator === 'between') {
        const [start, end] = filter.value.split(',');
        sqlFilters += ` AND ${filter.field} ${filter.operator} '${start}' AND '${end}'`;
      } else if (operator === 'like') {
        sqlFilters += ` AND ${filter.field} ${filter.operator} '%${filter.value}%'`;
      } else {
        sqlFilters += ` AND ${filter.field} ${filter.operator} '${filter.value}'`;
      }
    });
  }

  return { filters: sqlFilters, sort: sort?.[0] };
};