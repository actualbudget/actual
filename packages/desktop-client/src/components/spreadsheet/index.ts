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
  'rollover-budget': {
    // Common fields
    'uncategorized-amount': number;
    'uncategorized-balance': number;

    // Rollover fields
    'available-funds': number;
    'last-month-overspent': number;
    buffered: number;
    'to-budget': number;
    'from-last-month': number;
    'total-budgeted': number;
    'total-income': number;
    'total-spent': number;
    'total-leftover': number;
    'group-sum-amount': number;
    'group-budget': number;
    'group-leftover': number;
    budget: number;
    'sum-amount': number;
    leftover: number;
    carryover: number;
    goal: number;
    'long-goal': number;
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
  (id?: string): SheetFieldName =>
    `${field}-${id}` as SheetFieldName;
