export { q } from './app/query';
export declare function runImport(name: any, func: any): Promise<void>;
export declare function loadBudget(budgetId: any): Promise<void>;
export declare function downloadBudget(syncId: any, { password }?: {
    password?: any;
}): Promise<void>;
export declare function sync(): Promise<void>;
export declare function runBankSync(args?: {
    accountId: string;
}): Promise<void>;
export declare function batchBudgetUpdates(func: any): Promise<void>;
export declare function runQuery(query: any): Promise<unknown>;
export declare function getBudgetMonths(): Promise<string[]>;
export declare function getBudgetMonth(month: any): Promise<{
    month: string;
    incomeAvailable: number;
    lastMonthOverspent: number;
    forNextMonth: number;
    totalBudgeted: number;
    toBudget: number;
    fromLastMonth: number;
    totalIncome: number;
    totalSpent: number;
    totalBalance: number;
    categoryGroups: Record<string, unknown>[];
}>;
export declare function setBudgetAmount(month: any, categoryId: any, value: any): Promise<void>;
export declare function setBudgetCarryover(month: any, categoryId: any, flag: any): Promise<void>;
export declare function addTransactions(accountId: any, transactions: any, { learnCategories, runTransfers }?: {
    learnCategories?: boolean;
    runTransfers?: boolean;
}): Promise<"ok">;
export declare function importTransactions(accountId: any, transactions: any): Promise<{
    errors?: {
        message: string;
    }[];
    added: any;
    updated: any;
}>;
export declare function getTransactions(accountId: any, startDate: any, endDate: any): Promise<import("./loot-core/types/models").TransactionEntity[]>;
export declare function updateTransaction(id: any, fields: any): Promise<import("./loot-core/types/models").TransactionEntity[] | ({
    id: any;
    transfer_id: any;
} | {
    id: any;
    payee: any;
} | {
    id: any;
    category: any;
})[]>;
export declare function deleteTransaction(id: any): Promise<import("./loot-core/types/models").TransactionEntity[] | ({
    id: any;
    transfer_id: any;
} | {
    id: any;
    payee: any;
} | {
    id: any;
    category: any;
})[]>;
export declare function getAccounts(): Promise<import("./loot-core/server/api-models").APIAccountEntity[]>;
export declare function createAccount(account: any, initialBalance?: any): Promise<string>;
export declare function updateAccount(id: any, fields: any): Promise<void>;
export declare function closeAccount(id: any, transferAccountId?: any, transferCategoryId?: any): Promise<unknown>;
export declare function reopenAccount(id: any): Promise<unknown>;
export declare function deleteAccount(id: any): Promise<unknown>;
export declare function getCategoryGroups(): Promise<import("./loot-core/server/api-models").APICategoryGroupEntity[]>;
export declare function createCategoryGroup(group: any): Promise<string>;
export declare function updateCategoryGroup(id: any, fields: any): Promise<unknown>;
export declare function deleteCategoryGroup(id: any, transferCategoryId?: any): Promise<unknown>;
export declare function getCategories(): Promise<(import("./loot-core/server/api-models").APICategoryGroupEntity | import("./loot-core/server/api-models").APICategoryEntity)[]>;
export declare function createCategory(category: any): Promise<string>;
export declare function updateCategory(id: any, fields: any): Promise<unknown>;
export declare function deleteCategory(id: any, transferCategoryId?: any): Promise<{
    error?: string;
}>;
export declare function getPayees(): Promise<import("./loot-core/server/api-models").APIPayeeEntity[]>;
export declare function createPayee(payee: any): Promise<string>;
export declare function updatePayee(id: any, fields: any): Promise<unknown>;
export declare function deletePayee(id: any): Promise<unknown>;
export declare function getRules(): Promise<import("./loot-core/types/models").RuleEntity[]>;
export declare function getPayeeRules(id: any): Promise<import("./loot-core/types/models").RuleEntity[]>;
export declare function createRule(rule: any): Promise<import("./loot-core/types/models").RuleEntity>;
export declare function updateRule(rule: any): Promise<import("./loot-core/types/models").RuleEntity>;
export declare function deleteRule(id: any): Promise<boolean>;
export declare function getSchedules(): Promise<import("./loot-core/types/models").ScheduleEntity[]>;
export declare function createSchedule(schedule: any, conditions: any): Promise<string>;
export declare function updateSchedule(schedule: any, conditions: any, resetNextDate: any): Promise<void>;
export declare function deleteSchedule(id: any): Promise<void>;
export declare function scheduleSkipNextDate(id: any): Promise<void>;
export declare function scheduleGetUpcomingDates(config: any, count: any): Promise<string[]>;
