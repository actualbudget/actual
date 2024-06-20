export declare function getGoCardlessAccounts(userId: any, userKey: any, id: any): Promise<any>;
export declare function reconcileTransactions(acctId: any, transactions: any, isBankSyncAccount?: boolean): Promise<{
    added: any[];
    updated: any[];
}>;
export declare function addTransactions(acctId: any, transactions: any, { runTransfers, learnCategories }?: {
    runTransfers?: boolean;
    learnCategories?: boolean;
}): Promise<any>;
export declare function syncAccount(userId: string, userKey: string, id: string, acctId: string, bankId: string): Promise<{
    added: any[];
    updated: any[];
}>;
