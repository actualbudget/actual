export declare type FormatValidationFunction = (value: string) => boolean;
/** Shared string formats used by the TypeCompiler and Value modules */
export declare namespace Format {
    /** Clears all formats */
    function Clear(): void;
    /** Returns true if the string format exists */
    function Has(format: string): boolean;
    /** Sets a string format validation function */
    function Set(format: string, func: FormatValidationFunction): void;
    /** Gets a string format validation function */
    function Get(format: string): FormatValidationFunction | undefined;
}
