export declare function groupBy<TValue extends Record<string, unknown>>(values: TValue[], predicate: (value: TValue) => string): Record<string, TValue[]>;
