export declare function getSheetValue(sheetName: string, cell: string): Promise<number>;
export declare function isReflectBudget(): boolean;
export declare function getBudget({ category, month, }: {
    category: string;
    month: string;
}): number;
export declare function setBudget({ category, month, amount, }: {
    category: string;
    month: string;
    amount: unknown;
}): Promise<void>;
export declare function setGoal({ month, category, goal }: {
    month: any;
    category: any;
    goal: any;
}): Promise<void>;
export declare function setBuffer(month: string, amount: unknown): Promise<void>;
export declare function copyPreviousMonth({ month, }: {
    month: string;
}): Promise<void>;
export declare function copySinglePreviousMonth({ month, category, }: {
    month: string;
    category: string;
}): Promise<void>;
export declare function setZero({ month }: {
    month: string;
}): Promise<void>;
export declare function set3MonthAvg({ month, }: {
    month: string;
}): Promise<void>;
export declare function setNMonthAvg({ month, N, category, }: {
    month: string;
    N: number;
    category: string;
}): Promise<void>;
export declare function holdForNextMonth({ month, amount, }: {
    month: string;
    amount: number;
}): Promise<boolean>;
export declare function resetHold({ month }: {
    month: string;
}): Promise<void>;
export declare function coverOverspending({ month, to, from, }: {
    month: string;
    to: string;
    from: string;
}): Promise<void>;
export declare function transferAvailable({ month, amount, category, }: {
    month: string;
    amount: number;
    category: string;
}): Promise<void>;
export declare function coverOverbudgeted({ month, category, }: {
    month: string;
    category: string;
}): Promise<void>;
export declare function transferCategory({ month, amount, from, to, }: {
    month: string;
    amount: number;
    to: string;
    from: string;
}): Promise<void>;
export declare function setCategoryCarryover({ startMonth, category, flag, }: {
    startMonth: string;
    category: string;
    flag: boolean;
}): Promise<void>;
