export type QueryState = {
    filterExpressions: Array<string>;
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
export declare class Query {
    state: QueryState;
    constructor(state: any);
    filter(expr: any): Query;
    unfilter(exprs: any): Query;
    select(exprs?: Array<unknown> | unknown): Query;
    calculate(expr: any): Query;
    groupBy(exprs: any): Query;
    orderBy(exprs: any): Query;
    limit(num: any): Query;
    offset(num: any): Query;
    raw(): Query;
    withDead(): Query;
    withoutValidatedRefs(): Query;
    options(opts: any): Query;
    serialize(): QueryState;
}
export declare function getPrimaryOrderBy(query: any, defaultOrderBy: any): any;
export declare function q(table: any): Query;
