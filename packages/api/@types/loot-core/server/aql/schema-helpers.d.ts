export declare function convertInputType(value: any, type: any): any;
export declare function convertOutputType(value: any, type: any): any;
export declare function conform(schema: any, schemaConfig: any, table: any, obj: any, { skipNull }?: {
    skipNull?: boolean;
}): any;
export declare function convertForInsert(schema: any, schemaConfig: any, table: any, rawObj: any): any;
export declare function convertForUpdate(schema: any, schemaConfig: any, table: any, rawObj: any): any;
export declare function convertFromSelect(schema: any, schemaConfig: any, table: any, obj: any): {};
