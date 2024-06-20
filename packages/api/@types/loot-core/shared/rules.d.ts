export declare const TYPE_INFO: {
    date: {
        ops: string[];
        nullable: boolean;
    };
    id: {
        ops: string[];
        nullable: boolean;
    };
    saved: {
        ops: any[];
        nullable: boolean;
    };
    string: {
        ops: string[];
        nullable: boolean;
    };
    number: {
        ops: string[];
        nullable: boolean;
    };
    boolean: {
        ops: string[];
        nullable: boolean;
    };
};
export declare const FIELD_TYPES: Map<string, string>;
export declare const ALLOCATION_METHODS: {
    'fixed-amount': string;
    'fixed-percent': string;
    remainder: string;
};
export declare function mapField(field: any, opts?: any): any;
export declare function friendlyOp(op: any, type?: any): "" | "is" | "contains" | "one of" | "not one of" | "is not" | "is approx" | "is between" | "does not contain" | "is after" | "is greater than" | "is after or equals" | "is greater than or equals" | "is before" | "is less than" | "is before or equals" | "is less than or equals" | "is true" | "is false" | "set" | "allocate" | "link schedule" | "and" | "or";
export declare function deserializeField(field: any): {
    field: string;
    options: {
        inflow: boolean;
        outflow?: undefined;
    };
} | {
    field: string;
    options: {
        outflow: boolean;
        inflow?: undefined;
    };
} | {
    field: any;
    options?: undefined;
};
export declare function getFieldError(type: any): "Invalid date format" | "Value cannot be empty" | "Value must be a number" | "Please choose a valid field for this type of rule" | "Internal error, sorry! Please get in touch https://actualbudget.org/contact/ for support";
export declare function sortNumbers(num1: any, num2: any): any[];
export declare function parse(item: any): any;
export declare function unparse({ error, inputKey, ...item }: {
    [x: string]: any;
    error: any;
    inputKey: any;
}): {
    [x: string]: any;
};
export declare function makeValue(value: any, cond: any): any;
export declare function getApproxNumberThreshold(number: any): number;
