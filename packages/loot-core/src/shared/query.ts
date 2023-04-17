export type QueryState = {
  filterExpressions: Array<unknown>;
  selectExpressions: Array<unknown>;
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

  constructor(state) {
    this.state = {
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
    let exprSet = new Set(exprs);
    return new Query({
      ...this.state,
      filterExpressions: this.state.filterExpressions.filter(
        expr => !exprSet.has(Object.keys(expr)[0]),
      ),
    });
  }

  select(exprs: Array<unknown> | unknown = []) {
    if (!Array.isArray(exprs)) {
      exprs = [exprs];
    }

    let query = new Query({ ...this.state, selectExpressions: exprs });
    query.state.calculation = false;
    return query;
  }

  calculate(expr) {
    let query = this.select({ result: expr });
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

  limit(num) {
    return new Query({ ...this.state, limit: num });
  }

  offset(num) {
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

  options(opts) {
    return new Query({ ...this.state, tableOptions: opts });
  }

  serialize() {
    return this.state;
  }
}

export function getPrimaryOrderBy(query, defaultOrderBy) {
  let orderExprs = query.serialize().orderExpressions;
  if (orderExprs.length === 0) {
    if (defaultOrderBy) {
      return { order: 'asc', ...defaultOrderBy };
    }
    return null;
  }

  let firstOrder = orderExprs[0];
  if (typeof firstOrder === 'string') {
    return { field: firstOrder, order: 'asc' };
  }
  // Handle this form: { field: 'desc' }
  let [field] = Object.keys(firstOrder);
  return { field, order: firstOrder[field] };
}

export default function q(table) {
  return new Query({ table });
}
