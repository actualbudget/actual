/**
 * Query System - Single Source of Truth
 *
 * This is the main query implementation used by both loot-core and plugins.
 * No more conversion functions needed!
 */

import {
  ObjectExpression,
  IQuery,
  QueryState,
  WithRequired,
} from '@actual-app/shared-types';

export type { ObjectExpression, IQuery, QueryState };

export class Query implements IQuery {
  state: QueryState;

  constructor(state: WithRequired<Partial<QueryState>, 'table'>) {
    this.state = {
      tableOptions: state.tableOptions || {},
      filterExpressions: state.filterExpressions || [],
      selectExpressions: state.selectExpressions || [],
      groupExpressions: state.groupExpressions || [],
      orderExpressions: state.orderExpressions || [],
      calculation: false,
      rawMode: false,
      withDead: false,
      validateRefs: true,
      limit: null,
      offset: null,
      ...state,
    };
  }

  filter(expr: ObjectExpression) {
    return new Query({
      ...this.state,
      filterExpressions: [...this.state.filterExpressions, expr],
    });
  }

  unfilter(exprs?: Array<keyof ObjectExpression>) {
    // Remove all filters if no arguments are passed
    if (!exprs) {
      return new Query({
        ...this.state,
        filterExpressions: [],
      });
    }

    const exprSet = new Set(exprs);
    return new Query({
      ...this.state,
      filterExpressions: this.state.filterExpressions.filter(
        expr => !exprSet.has(Object.keys(expr)[0]),
      ),
    });
  }

  select(
    exprs:
      | Array<ObjectExpression | string>
      | ObjectExpression
      | string
      | '*'
      | ['*'] = [],
  ) {
    if (!Array.isArray(exprs)) {
      exprs = [exprs];
    }

    return new Query({
      ...this.state,
      selectExpressions: exprs,
      calculation: false,
    });
  }

  calculate(expr: ObjectExpression | string) {
    return new Query({
      ...this.state,
      selectExpressions: [{ result: expr }],
      calculation: true,
    });
  }

  groupBy(exprs: ObjectExpression | string | Array<ObjectExpression | string>) {
    if (!Array.isArray(exprs)) {
      exprs = [exprs];
    }

    return new Query({
      ...this.state,
      groupExpressions: [...this.state.groupExpressions, ...exprs],
    });
  }

  orderBy(exprs: ObjectExpression | string | Array<ObjectExpression | string>) {
    if (!Array.isArray(exprs)) {
      exprs = [exprs];
    }

    return new Query({
      ...this.state,
      orderExpressions: [...this.state.orderExpressions, ...exprs],
    });
  }

  limit(num: number) {
    return new Query({ ...this.state, limit: num });
  }

  offset(num: number) {
    return new Query({ ...this.state, offset: num });
  }

  raw() {
    return new Query({ ...this.state, rawMode: true });
  }

  withDead() {
    return new Query({ ...this.state, withDead: true });
  }

  withoutValidatedRefs() {
    return new Query({ ...this.state, validateRefs: false });
  }

  options(opts: Record<string, unknown>) {
    return new Query({ ...this.state, tableOptions: opts });
  }

  reset() {
    return q(this.state.table);
  }

  serialize() {
    return this.state;
  }

  serializeAsString() {
    return JSON.stringify(this.serialize());
  }
}

/**
 * Query builder function - creates a new Query for the given table
 */
export function q(table: QueryState['table']) {
  return new Query({ table });
}

export type { QueryBuilder } from '@actual-app/shared-types';

/**
 * Helper function to get primary order by clause
 */
export function getPrimaryOrderBy(
  query: Query,
  defaultOrderBy: ObjectExpression | null,
) {
  const orderExprs = query.serialize().orderExpressions;
  if (orderExprs.length === 0) {
    if (defaultOrderBy) {
      return { order: 'asc', ...defaultOrderBy };
    }
    return null;
  }

  const firstOrder = orderExprs[0];
  if (typeof firstOrder === 'string') {
    return { field: firstOrder, order: 'asc' };
  }
  // Handle this form: { field: 'desc' }
  const [field] = Object.keys(firstOrder);
  return { field, order: firstOrder[field] };
}
