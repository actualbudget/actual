/// <reference types="node" />
type ImportableBudgetType = 'ynab4' | 'ynab5' | 'actual';
export declare function handleBudgetImport(type: ImportableBudgetType, filepath: string, buffer: Buffer): Promise<{
    error: any;
}>;
export {};
