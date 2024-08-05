import { type Query } from 'loot-core/src/shared/query';

export type Spreadsheets = {
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

export type SheetNames = keyof Spreadsheets & string;

export type SheetFields<SheetName extends SheetNames> =
  keyof Spreadsheets[SheetName] & string;

export type Binding<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  SheetName extends SheetNames = any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  SheetFieldName extends SheetFields<SheetName> = any,
> =
  | SheetFieldName
  | {
      name: SheetFieldName;
      value?: Spreadsheets[SheetName][SheetFieldName];
      query?: Query;
    };
export const parametrizedField =
  <SheetName extends SheetNames>() =>
  <SheetFieldName extends SheetFields<SheetName>>(field: SheetFieldName) =>
  (id: string): SheetFieldName =>
    `${field}-${id}` as SheetFieldName;
