export declare function quoteAlias(alias: any): any;
export declare function isAggregateQuery(queryState: any): boolean;
export type SchemaConfig = {
    tableViews?: Record<string, unknown> | ((name: string, config: {
        withDead: any;
        isJoin: any;
        tableOptions: any;
    }) => unknown);
    tableFilters?: (name: string) => unknown[];
    customizeQuery?: <T extends {
        table: string;
        orderExpressions: unknown[];
    }>(queryString: T) => T;
    views?: Record<string, {
        fields?: Record<string, string>;
        [key: `v_${string}`]: string | ((internalFields: any, publicFields: any) => string);
    }>;
};
export declare function compileQuery(queryState: any, schema: any, schemaConfig?: SchemaConfig): {
    sqlPieces: {
        select: string;
        from: unknown;
        joins: string;
        where: string;
        groupBy: string;
        orderBy: string;
        limit: any;
        offset: any;
    };
    state: {
        schema: any;
        implicitTableName: any;
        implicitTableId: unknown;
        paths: Map<any, any>;
        dependencies: any[];
        compileStack: any[];
        outputTypes: Map<any, any>;
        validateRefs: any;
        namedParameters: any[];
    };
};
export declare function defaultConstructQuery(queryState: any, state: any, sqlPieces: any): string;
export declare function generateSQLWithState(queryState: any, schema?: unknown, schemaConfig?: unknown): {
    sql: string;
    state: {
        schema: any;
        implicitTableName: any;
        implicitTableId: unknown;
        paths: Map<any, any>;
        dependencies: any[];
        compileStack: any[];
        outputTypes: Map<any, any>;
        validateRefs: any;
        namedParameters: any[];
    };
};
