export declare function last<T>(arr: Array<T>): T;
export declare function getChangedValues<T extends {
    id?: string;
}>(obj1: T, obj2: T): Partial<T>;
export declare function hasFieldsChanged<T extends object>(obj1: T, obj2: T, fields: Array<keyof T>): boolean;
export declare function applyChanges<T extends {
    id: string;
}>(changes: {
    added?: T[];
    updated?: T[];
    deleted?: T[];
}, items: T[]): T[];
export declare function partitionByField<T, K extends keyof T>(data: T[], field: K): Map<any, any>;
export declare function groupBy<T, K extends keyof T>(data: T[], field: K): Map<T[K], T[]>;
export declare function diffItems<T extends {
    id: string;
}>(items: T[], newItems: T[]): {
    added: T[];
    updated: Partial<T>[];
    deleted: {
        id: string;
    }[];
};
export declare function groupById<T extends {
    id: string;
}>(data: T[]): {
    [key: string]: T;
};
export declare function setIn(map: Map<string, unknown>, keys: string[], item: unknown): void;
export declare function getIn(map: any, keys: any): any;
export declare function fastSetMerge<T>(set1: Set<T>, set2: Set<T>): Set<T>;
export declare function titleFirst(str: string): string;
export declare function appendDecimals(amountText: string, hideDecimals?: boolean): string;
type NumberFormats = 'comma-dot' | 'dot-comma' | 'space-comma' | 'space-dot' | 'comma-dot-in';
export declare const numberFormats: Array<{
    value: NumberFormats;
    label: string;
    labelNoFraction: string;
}>;
declare let numberFormatConfig: {
    format: NumberFormats;
    hideFraction: boolean;
};
export declare function setNumberFormat(config: typeof numberFormatConfig): void;
export declare function getNumberFormat({ format, hideFraction, }?: {
    format?: NumberFormats;
    hideFraction: boolean;
}): {
    value: NumberFormats;
    separator: any;
    formatter: Intl.NumberFormat;
    regex: any;
    separatorRegex: any;
};
export declare function safeNumber(value: number): number;
export declare function toRelaxedNumber(value: string): number;
export declare function integerToCurrency(n: number, formatter?: Intl.NumberFormat): string;
export declare function amountToCurrency(n: any): string;
export declare function amountToCurrencyNoDecimal(n: any): string;
export declare function currencyToAmount(str: string): any;
export declare function currencyToInteger(str: string): number;
export declare function stringToInteger(str: string): number;
export declare function amountToInteger(n: number): number;
export declare function integerToAmount(n: any): number;
export declare function looselyParseAmount(amount: string): number;
export declare function sortByKey<T>(arr: T[], key: keyof T): T[];
export {};
