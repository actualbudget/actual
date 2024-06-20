export declare function generateAccount(name: any, isConnected: any, offbudget: any): {
    id: string;
    name: any;
    balance_current: number;
    bank: number;
    bankId: number;
    bankName: string;
    offbudget: number;
    closed: number;
};
export declare function generateCategory(name: any, group: any, isIncome?: boolean): {
    id: string;
    name: any;
    cat_group: any;
    is_income: number;
    sort_order: number;
};
export declare function generateCategoryGroup(name: any, isIncome?: boolean): {
    id: string;
    name: any;
    is_income: number;
    sort_order: number;
};
export declare function generateCategoryGroups(definition: any): any;
export declare function generateTransaction(data: any, splitAmount?: any, showError?: boolean): any[];
export declare function generateTransactions(count: any, accountId: any, groupId: any, splitAtIndexes?: any[], showError?: boolean): any[];
