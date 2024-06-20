export function q(table: any): Query;
declare class Query {
    constructor(state: any);
    state: any;
    filter(expr: any): Query;
    unfilter(exprs: any): Query;
    select(exprs?: any[]): Query;
    calculate(expr: any): Query;
    groupBy(exprs: any): Query;
    orderBy(exprs: any): Query;
    limit(num: any): Query;
    offset(num: any): Query;
    raw(): Query;
    withDead(): Query;
    withoutValidatedRefs(): Query;
    options(opts: any): Query;
    serialize(): any;
}
export {};
