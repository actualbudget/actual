class Query {
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

  select(exprs = []) {
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

export default function q(table) {
  return new Query({ table });
}
