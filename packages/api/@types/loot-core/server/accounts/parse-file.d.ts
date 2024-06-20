type ParseError = {
    message: string;
    internal: string;
};
export type ParseFileResult = {
    errors?: ParseError[];
    transactions?: unknown[];
};
type ParseFileOptions = {
    hasHeaderRow?: boolean;
    delimiter?: string;
    fallbackMissingPayeeToMemo?: boolean;
};
export declare function parseFile(filepath: string, options?: ParseFileOptions): Promise<ParseFileResult>;
export {};
