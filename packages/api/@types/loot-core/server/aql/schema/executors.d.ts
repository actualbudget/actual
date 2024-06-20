declare function execTransactions(state: any, query: any, sql: any, params: any, outputTypes: any): Promise<any>;
export declare function isHappyPathQuery(queryState: any): boolean;
export declare const schemaExecutors: {
    transactions: typeof execTransactions;
};
export {};
