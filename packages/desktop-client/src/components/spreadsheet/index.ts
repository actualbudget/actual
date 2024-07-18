import { type Query } from 'loot-core/src/shared/query';

export type SpreadsheetFieldTypes = {
  account: {
    // Common fields
    'uncategorized-amount': number;
    'uncategorized-balance': number;

    // Account fields
    balance: number;
    'accounts-balance': number;
    'budgeted-accounts-balance': number;
    'offbudget-accounts-balance': number;
    balanceCleared: number;
    balanceUncleared: number;
  };
};

export type SheetNames = keyof SpreadsheetFieldTypes & string;

export type SheetFields<SheetName extends SheetNames> =
  keyof SpreadsheetFieldTypes[SheetName] & string;

export type Binding<
  SheetName extends SheetNames = any,
  FieldName extends SheetFields<SheetName> = any,
> =
  | FieldName
  | {
      name: FieldName;
      value?: SpreadsheetFieldTypes[SheetName][FieldName];
      query?: Query;
    };
