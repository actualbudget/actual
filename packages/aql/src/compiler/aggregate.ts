import { QueryState } from "../query";

const AGGREGATE_FUNCTIONS = ['$sum', '$count'];
function isAggregateFunction(expr): boolean {
  if (typeof expr !== 'object' || Array.isArray(expr)) {
    return false;
  }

  let [name, argExprs] = Object.entries<any>(expr)[0];
  if (!Array.isArray(argExprs)) {
    argExprs = [argExprs];
  }

  if (AGGREGATE_FUNCTIONS.indexOf(name) !== -1) {
    return true;
  }

  return argExprs.some(ex => isAggregateFunction(ex));
}

export function isAggregateQuery(queryState: QueryState): boolean {
  // it's aggregate if:
  // either an aggregate function is used in `select`
  // or a `groupBy` exists

  if (queryState.groupExpressions.length > 0) {
    return true;
  }

  return queryState.selectExpressions.find(expr => {
    if (typeof expr !== 'string') {
      const [firstValue] = Object.values(expr);
      return isAggregateFunction(firstValue);
    }
    return false;
  });
}
