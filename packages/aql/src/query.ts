
type TableOptions = {
  splits: "all" | "grouped" | "inline" | "none"
}

export type QueryState = {
    filterExpressions: any[];
    selectExpressions: any[];
    groupExpressions: any[];
    orderExpressions: any[];
    limit: number | null;
    offset: number | null;
    calculation: boolean;
    rawMode: boolean;
    withDead: boolean;
    validateRefs: boolean;
    table?: string;
    tableOptions?: TableOptions;
}

export class Query {
  state: QueryState = {
    filterExpressions: [],
    selectExpressions: [],
    groupExpressions: [],
    orderExpressions: [],
    calculation: false,
    rawMode: false,
    withDead: false,
    validateRefs: true,
    limit: null,
    offset: null,
  };

  constructor(state: Partial<QueryState>) {
    this.state = {
      ...this.state,
      ...state
    };
  }

  filter(expr): Query {
    return new Query({
      ...this.state,
      filterExpressions: [...this.state.filterExpressions, expr]
    });
  }

  unfilter(exprs): Query {
    let exprSet = new Set(exprs);
    return new Query({
      ...this.state,
      filterExpressions: this.state.filterExpressions.filter(
        expr => !exprSet.has(Object.keys(expr)[0])
      )
    });
  }

  select(exprs: any = []): Query {
    if (!Array.isArray(exprs)) {
      exprs = [exprs];
    }

    let query = new Query({ ...this.state, selectExpressions: exprs });
    query.state.calculation = false;
    return query;
  }

  calculate(expr): Query {
    let query = this.select({ result: expr });
    query.state.calculation = true;
    return query;
  }

  groupBy(exprs): Query {
    if (!Array.isArray(exprs)) {
      exprs = [exprs];
    }

    return new Query({
      ...this.state,
      groupExpressions: [...this.state.groupExpressions, ...exprs]
    });
  }

  orderBy(exprs): Query {
    if (!Array.isArray(exprs)) {
      exprs = [exprs];
    }

    return new Query({
      ...this.state,
      orderExpressions: [...this.state.orderExpressions, ...exprs]
    });
  }

  limit(limit: number): Query {
    return new Query({ ...this.state, limit });
  }

  offset(offset: number): Query {
    return new Query({ ...this.state, offset });
  }

  raw(): Query {
    return new Query({ ...this.state, rawMode: true });
  }

  withDead(): Query {
    return new Query({ ...this.state, withDead: true });
  }

  withoutValidatedRefs(): Query {
    return new Query({ ...this.state, validateRefs: false });
  }

  options(tableOptions: TableOptions): Query {
    return new Query({ ...this.state, tableOptions });
  }

  serialize(): QueryState {
    return this.state;
  }
}

export function getPrimaryOrderBy(query: Query, defaultOrderBy: {field: string; order?: "asc" | "desc"}): {field: string; order?: "asc" | "desc"} {
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

export const q = (table: string) =>  new Query({ table });
