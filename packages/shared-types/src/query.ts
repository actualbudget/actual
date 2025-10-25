/**
 * Query System Types
 */

export type ObjectExpression = {
  [key: string]: ObjectExpression | unknown;
};

export type QueryState = {
  get table(): string;
  get tableOptions(): Readonly<Record<string, unknown>>;
  get filterExpressions(): ReadonlyArray<ObjectExpression>;
  get selectExpressions(): ReadonlyArray<ObjectExpression | string | '*'>;
  get groupExpressions(): ReadonlyArray<ObjectExpression | string>;
  get orderExpressions(): ReadonlyArray<ObjectExpression | string>;
  get calculation(): boolean;
  get rawMode(): boolean;
  get withDead(): boolean;
  get validateRefs(): boolean;
  get limit(): number | null;
  get offset(): number | null;
};

export type IQuery = {
  state: QueryState;
  filter(expr: ObjectExpression): IQuery;
  unfilter(exprs?: Array<keyof ObjectExpression>): IQuery;
  select(
    exprs:
      | Array<ObjectExpression | string>
      | ObjectExpression
      | string
      | '*'
      | ['*'],
  ): IQuery;
  calculate(expr: ObjectExpression | string): IQuery;
  groupBy(
    exprs: ObjectExpression | string | Array<ObjectExpression | string>,
  ): IQuery;
  orderBy(
    exprs: ObjectExpression | string | Array<ObjectExpression | string>,
  ): IQuery;
  limit(num: number): IQuery;
  offset(num: number): IQuery;
  raw(): IQuery;
  withDead(): IQuery;
  withoutValidatedRefs(): IQuery;
  options(opts: Record<string, unknown>): IQuery;
  reset(): IQuery;
  serialize(): QueryState;
  serializeAsString(): string;
};

export type QueryBuilder = (table: string) => IQuery;
