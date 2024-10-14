import { WithRequired } from '../types/util';

// @ts-strict-ignore
export type QueryState = {
  table: string;
  tableOptions: object;
  filterExpressions: Array<string>;
  selectExpressions: Array<unknown> | unknown | '*' | string;
  groupExpressions: Array<unknown>;
  orderExpressions: Array<unknown>;
  calculation: boolean;
  rawMode: boolean;
  withDead: boolean;
  validateRefs: boolean;
  limit: number | null;
  offset: number | null;
};

export class Query {
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

  filter(expr) {
    return new Query({
      ...this.state,
      filterExpressions: [...this.state.filterExpressions, expr],
    });
  }

  unfilter(exprs) {
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
      | Array<string>
      | Array<Record<string, unknown>>
      | Record<string, unknown>
      | '*'
      | string = [],
  ) {
    let exprsToUse: Array<unknown>;
    if (!Array.isArray(exprs)) {
      exprsToUse = [exprs];
    } else {
      exprsToUse = exprs;
    }

    const query = new Query({ ...this.state, selectExpressions: exprsToUse });
    query.state.calculation = false;
    return query;
  }

  calculate(expr) {
    const query = this.select({ result: expr });
    query.state.calculation = true;
    return query;
  }

  groupBy(exprs) {
    if (!Array.isArray(exprs)) {
      exprs = [exprs];
    }

    return new Query({
      ...this.state,
      groupExpressions: [...this.state.groupExpressions, ...exprs],
    });
  }

  orderBy(exprs) {
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

  options(opts: object) {
    return new Query({ ...this.state, tableOptions: opts });
  }

  serialize() {
    return this.state;
  }
}

export function getPrimaryOrderBy(query, defaultOrderBy) {
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

export function q(table) {
  return new Query({ table });
}
