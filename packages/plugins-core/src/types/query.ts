/**
 * Plugin Query Types
 * 
 * These types provide an interface between plugins and loot-core's query system
 * without direct dependencies on loot-core.
 */

type ObjectExpression = {
  [key: string]: ObjectExpression | unknown;
};

/**
 * Plugin-specific query state interface that mirrors loot-core's QueryState
 * but is independent of loot-core implementation.
 */
export interface PluginQueryState {
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
}

/**
 * Plugin-specific Query interface that provides the same functionality as loot-core's Query
 * but is independent of loot-core implementation.
 */
export interface PluginQuery {
  readonly state: PluginQueryState;

  filter(expr: ObjectExpression): PluginQuery;
  unfilter(exprs?: Array<keyof ObjectExpression>): PluginQuery;
  select(
    exprs:
      | Array<ObjectExpression | string>
      | ObjectExpression
      | string
      | '*'
      | ['*']
  ): PluginQuery;
  calculate(expr: ObjectExpression | string): PluginQuery;
  groupBy(exprs: ObjectExpression | string | Array<ObjectExpression | string>): PluginQuery;
  orderBy(exprs: ObjectExpression | string | Array<ObjectExpression | string>): PluginQuery;
  limit(num: number): PluginQuery;
  offset(num: number): PluginQuery;
  raw(): PluginQuery;
  withDead(): PluginQuery;
  withoutValidatedRefs(): PluginQuery;
  options(opts: Record<string, unknown>): PluginQuery;
  reset(): PluginQuery;
  serialize(): PluginQueryState;
  serializeAsString(): string;
}

/**
 * Plugin-specific query builder function type
 */
export interface PluginQueryBuilder {
  (table: string): PluginQuery;
}

/**
 * Host-provided query builder function type (loot-core's q function)
 * This is what the host application provides in the context
 */
export interface HostQueryBuilder {
  (table: string): LootCoreQuery;
}

/**
 * Host-provided loot-core query builder for conversion utilities
 * Used internally by convertPluginQueryToLootCore
 */
export interface LootCoreQueryBuilder {
  (table: string): LootCoreQuery;
}

/**
 * Interface representing loot-core's QueryState object
 */
export interface LootCoreQueryState {
  table: string;
  tableOptions: Record<string, unknown>;
  filterExpressions: ReadonlyArray<any>;
  selectExpressions: ReadonlyArray<any>;
  groupExpressions: ReadonlyArray<any>;
  orderExpressions: ReadonlyArray<any>;
  calculation: boolean;
  rawMode: boolean;
  withDead: boolean;
  validateRefs: boolean;
  limit: number | null;
  offset: number | null;
}

/**
 * Interface representing loot-core's Query object
 * Used for type safety in conversion functions
 */
export interface LootCoreQuery {
  state: LootCoreQueryState;
  filter(expr: any): LootCoreQuery;
  unfilter(exprs?: Array<keyof any>): LootCoreQuery;
  select(exprs: any): LootCoreQuery;
  calculate(expr: any): LootCoreQuery;
  groupBy(exprs: any): LootCoreQuery;
  orderBy(exprs: any): LootCoreQuery;
  limit(num: number): LootCoreQuery;
  offset(num: number): LootCoreQuery;
  raw(): LootCoreQuery;
  withDead(): LootCoreQuery;
  withoutValidatedRefs(): LootCoreQuery;
  options(opts: Record<string, unknown>): LootCoreQuery;
  reset(): LootCoreQuery;
  serialize(): any;
  serializeAsString(): string;
} 