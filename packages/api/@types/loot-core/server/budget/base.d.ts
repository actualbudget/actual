export declare function getBudgetType(): any;
export declare function getBudgetRange(start: string, end: string): {
    start: string;
    end: string;
    range: string[];
};
export declare function triggerBudgetChanges(oldValues: any, newValues: any): void;
export declare function doTransfer(categoryIds: any, transferId: any): Promise<void>;
export declare function createBudget(months: any): Promise<void>;
export declare function createAllBudgets(): Promise<{
    start: string;
    end: string;
}>;
export declare function setType(type: any): Promise<{
    start: string;
    end: string;
}>;
