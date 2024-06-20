import { Query, type QueryState } from '../../../shared/query';
export declare function runCompiledQuery(query: any, sqlPieces: any, state: any, params?: unknown): Promise<any>;
export declare function runQuery(query: Query | QueryState, params?: unknown): Promise<{
    data: any;
    dependencies: any[];
}>;
