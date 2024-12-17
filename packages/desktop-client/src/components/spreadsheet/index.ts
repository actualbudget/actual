import { type Query } from 'loot-core/src/shared/query';

export type Spreadsheets = {
  account: {
    // Common fields
    'uncategorized-amount': number;
    'uncategorized-balance': number;

    // Account fields
    balance: number;
    [key: `balance-${string}-cleared`]: number | null;
    'accounts-balance': number;
    'onbudget-accounts-balance': number;
    'offbudget-accounts-balance': number;
    balanceCleared: number;
    balanceUncleared: number;
  };
  'envelope-budget': {
    // Common fields
    'uncategorized-amount': number;
    'uncategorized-balance': number;

    // Envelope budget fields
    'available-funds': number;
    'last-month-overspent': number;
    buffered: number;
    'to-budget': number | null;
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
  'tracking-budget': {
    // Common fields
    'uncategorized-amount': number;
    'uncategorized-balance': number;

    // Tracking budget fields
    'total-budgeted': number;
    'total-budget-income': number;
    'total-saved': number;
    'total-income': number;
    'total-spent': number;
    'real-saved': number;
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
  [`balance`]: {
    // Common fields
    'uncategorized-amount': number;
    'uncategorized-balance': number;

    // Balance fields
    [key: `balance-query-${string}-cleared`]: number;
  };
};

export type SheetNames = keyof Spreadsheets & string;

export type SheetFields<SheetName extends SheetNames> =
  keyof Spreadsheets[SheetName] & string;

export type Binding<
  SheetName extends SheetNames,
  SheetFieldName extends SheetFields<SheetName>,
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
