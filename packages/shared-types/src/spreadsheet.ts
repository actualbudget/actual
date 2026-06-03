type ObjectExpression = {
  [key: string]: unknown;
};

type QueryStateLike = {
  readonly table: string;
  readonly tableOptions: Readonly<Record<string, unknown>>;
  readonly filterExpressions: ReadonlyArray<ObjectExpression>;
  readonly selectExpressions: ReadonlyArray<ObjectExpression | string | '*'>;
  readonly groupExpressions: ReadonlyArray<ObjectExpression | string>;
  readonly orderExpressions: ReadonlyArray<ObjectExpression | string>;
  readonly calculation: boolean;
  readonly rawMode: boolean;
  readonly withDead: boolean;
  readonly validateRefs: boolean;
  readonly limit: number | null;
  readonly offset: number | null;
};

export type QueryLike = {
  serialize(): QueryStateLike;
  serializeAsString(): string;
};

export type Spreadsheets = {
  account: {
    'uncategorized-amount': number;
    'uncategorized-balance': number;
    balance: number;
    [key: `balance-${string}-cleared`]: number | null;
    'accounts-balance': number;
    'onbudget-accounts-balance': number;
    'offbudget-accounts-balance': number;
    'closed-accounts-balance': number;
    balanceCleared: number;
    balanceUncleared: number;
    lastReconciled: string | null;
  };
  category: {
    'uncategorized-amount': number;
    'uncategorized-balance': number;
    balance: number;
    balanceCleared: number;
    balanceUncleared: number;
  };
  'envelope-budget': {
    'uncategorized-amount': number;
    'uncategorized-balance': number;
    'available-funds': number;
    'last-month-overspent': number;
    buffered: number;
    'buffered-auto': number;
    'buffered-selected': number;
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
    'uncategorized-amount': number;
    'uncategorized-balance': number;
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
  balance: {
    'uncategorized-amount': number;
    'uncategorized-balance': number;
    [key: `balance-query-${string}`]: number;
    [key: `selected-transactions-${string}`]: Array<{ id: string }>;
    [key: `selected-balance-${string}`]: number;
  };
};

export type SheetNames = keyof Spreadsheets & string;

export type SheetFields<SheetName extends SheetNames> =
  keyof Spreadsheets[SheetName] & string;

export type BindingObject<
  SheetName extends SheetNames,
  SheetFieldName extends SheetFields<SheetName>,
  QueryType = QueryLike,
> = {
  name: SheetFieldName;
  value?: Spreadsheets[SheetName][SheetFieldName] | undefined;
  query?: QueryType | undefined;
};

export type Binding<
  SheetName extends SheetNames,
  SheetFieldName extends SheetFields<SheetName>,
  QueryType = QueryLike,
> =
  | SheetFieldName
  | {
      name: SheetFieldName;
      value?: Spreadsheets[SheetName][SheetFieldName] | undefined;
      query?: QueryType | undefined;
    };

export const parametrizedField =
  <SheetName extends SheetNames>() =>
  <SheetFieldName extends SheetFields<SheetName>>(field: SheetFieldName) =>
  (id?: string): SheetFieldName =>
    id ? (`${field}-${id}` as SheetFieldName) : field;
