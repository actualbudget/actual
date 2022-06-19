export type PathInfo = {
    tableName: string,
    tableId: string,
    joinField: string,
    joinTable: string,
    noMapping?: boolean
}

export type StackElement = {
    type: "expr" | "function" | "op" | "filter" | "select" | "groupBy" | "orderBy" | "value";
    value?: any;
    args?: any[];
}

export type CompilerState = {
    schema: any;
    implicitTableName: string;
    implicitTableId: string;
    paths: Map<string, PathInfo>;
    dependencies: string[];
    compileStack: StackElement[];
    outputTypes: Map<string, any>;
    validateRefs: boolean;
    namedParameters: any[];
    orders?: any;
    filterExpressions?: any[];
    selectExpressions?: any[];
    groupExpressions?: any[];
    orderExpressions?: any[];
    table?: string;
    implicitField?: string;
}
