import type { FieldType } from 'loot-core/types/chart-spec';

import type { ColumnType } from './processQueryResult';

export function toFieldType(colType: ColumnType): FieldType {
  switch (colType) {
    case 'integer':
    case 'float':
    case 'number':
      return 'number';
    case 'date':
    case 'date-month':
    case 'date-year':
      return 'date';
    case 'string':
    case 'boolean':
    case 'id':
    default:
      return 'category';
  }
}

export function toColumnType(fieldType: FieldType): ColumnType {
  switch (fieldType) {
    case 'number':
      return 'float';
    case 'date':
      return 'date';
    case 'category':
      return 'string';
    default:
      return 'string';
  }
}
