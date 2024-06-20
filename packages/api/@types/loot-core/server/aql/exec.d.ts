export declare function execQuery(queryState: any, state: any, sqlPieces: any, params: any, outputTypes: any): Promise<any>;
export declare function runCompiledQuery(query: any, pieces: any, state: any, { params, executors }?: {
    params?: {};
    executors?: {};
}): Promise<any>;
export declare function runQuery(schema: any, schemaConfig: any, query: any, options: any): Promise<{
    data: any;
    dependencies: any[];
}>;
