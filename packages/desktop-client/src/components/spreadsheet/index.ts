// @ts-strict-ignore
import {
  type SheetNames,
  type BudgetField,
  type SpreadsheetFieldTypes,
} from 'loot-core/client/queries';
import { type Query } from 'loot-core/src/shared/query';

export type Binding<
  SheetName extends SheetNames = any,
  FieldName extends BudgetField<SheetName> = any,
> =
  | FieldName
  | {
      name: FieldName;
      value?: SpreadsheetFieldTypes[SheetName][FieldName];
      query?: Query;
    };
