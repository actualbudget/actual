export type TypedValue = {
    value: string | number | string[];
    type: "id" | "boolean" | "string" | "integer" | "float" | "date" | 'date-year' | 'date-month' | "array" | "json" | "json/fallback" | "null" | "any";
    literal: boolean;
}

export type Param = {
    value: string | number;
    type: "param";
    paramName: string;
}

// Schema

type SchemaFieldDefinition = {
    type: "id" | "boolean" | "string" | "integer" | "float" | "date" | "json" | "json/fallback";
    ref?: string;
    required?: boolean;
    default?: () => number;
}

type SchemaTableDefinition = Record<string, SchemaFieldDefinition>

export type Schema = Record<string, SchemaTableDefinition>

// CompilerState

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
    schema: Schema;
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
