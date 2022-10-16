import * as Types from '../typebox';
export declare enum ValueErrorType {
    Array = 0,
    ArrayMinItems = 1,
    ArrayMaxItems = 2,
    ArrayUniqueItems = 3,
    Boolean = 4,
    Function = 5,
    Integer = 6,
    IntegerMultipleOf = 7,
    IntegerExclusiveMinimum = 8,
    IntegerExclusiveMaximum = 9,
    IntegerMinimum = 10,
    IntegerMaximum = 11,
    Literal = 12,
    Never = 13,
    Null = 14,
    Number = 15,
    NumberMultipleOf = 16,
    NumberExclusiveMinimum = 17,
    NumberExclusiveMaximum = 18,
    NumberMinumum = 19,
    NumberMaximum = 20,
    Object = 21,
    ObjectMinProperties = 22,
    ObjectMaxProperties = 23,
    ObjectAdditionalProperties = 24,
    Promise = 25,
    RecordKeyNumeric = 26,
    RecordKeyString = 27,
    String = 28,
    StringMinLength = 29,
    StringMaxLength = 30,
    StringPattern = 31,
    StringFormatUnknown = 32,
    StringFormat = 33,
    TupleZeroLength = 34,
    TupleLength = 35,
    Undefined = 36,
    Union = 37,
    Uint8Array = 38,
    Uint8ArrayMinByteLength = 39,
    Uint8ArrayMaxByteLength = 40,
    Void = 41
}
export interface ValueError {
    type: ValueErrorType;
    schema: Types.TSchema;
    path: string;
    value: unknown;
    message: string;
}
export declare class ValueErrorsUnknownTypeError extends Error {
    readonly schema: Types.TSchema;
    constructor(schema: Types.TSchema);
}
export declare namespace ValueErrors {
    function Errors<T extends Types.TSchema>(schema: T, references: Types.TSchema[], value: any): IterableIterator<ValueError>;
}
