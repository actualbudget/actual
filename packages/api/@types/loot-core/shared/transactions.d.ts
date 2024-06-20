import { type TransactionEntity, type NewTransactionEntity } from '../types/models';
import { applyChanges } from './util';
interface TransactionEntityWithError extends TransactionEntity {
    error: ReturnType<typeof SplitTransactionError> | null;
    _deleted?: boolean;
}
export declare function isTemporaryId(id: string): boolean;
export declare function isPreviewId(id: string): boolean;
declare function SplitTransactionError(total: number, parent: TransactionEntity): {
    type: string;
    version: number;
    difference: number;
};
type GenericTransactionEntity = NewTransactionEntity | TransactionEntity | TransactionEntityWithError;
export declare function makeChild<T extends GenericTransactionEntity>(parent: T, data?: object): T;
export declare function recalculateSplit(trans: TransactionEntity): TransactionEntityWithError;
export declare function ungroupTransactions(transactions: TransactionEntity[]): TransactionEntity[];
export declare function groupTransaction(split: TransactionEntity[]): TransactionEntity;
export declare function ungroupTransaction(split: TransactionEntity | null): TransactionEntity[];
export declare function applyTransactionDiff(groupedTrans: Parameters<typeof ungroupTransaction>[0], diff: Parameters<typeof applyChanges>[0]): TransactionEntity;
export declare function addSplitTransaction(transactions: TransactionEntity[], id: string): {
    data: any[];
    diff: {
        deleted: any[];
        updated: any[];
    };
    newTransaction?: undefined;
} | {
    data: TransactionEntity[];
    newTransaction: TransactionEntityWithError | TransactionEntity;
    diff: any;
};
export declare function updateTransaction(transactions: TransactionEntity[], transaction: TransactionEntity): {
    data: any[];
    diff: {
        deleted: any[];
        updated: any[];
    };
    newTransaction?: undefined;
} | {
    data: TransactionEntity[];
    newTransaction: TransactionEntityWithError | TransactionEntity;
    diff: any;
};
export declare function deleteTransaction(transactions: TransactionEntity[], id: string): {
    data: any[];
    diff: {
        deleted: any[];
        updated: any[];
    };
    newTransaction?: undefined;
} | {
    data: TransactionEntity[];
    newTransaction: TransactionEntityWithError | TransactionEntity;
    diff: any;
};
export declare function splitTransaction(transactions: TransactionEntity[], id: string, createSubtransactions?: (parentTransaction: TransactionEntity) => TransactionEntity[]): {
    data: any[];
    diff: {
        deleted: any[];
        updated: any[];
    };
    newTransaction?: undefined;
} | {
    data: TransactionEntity[];
    newTransaction: TransactionEntityWithError | TransactionEntity;
    diff: any;
};
export declare function realizeTempTransactions(transactions: TransactionEntity[]): {
    id: string;
    account: import("../types/models").AccountEntity;
    category?: import("../types/models").CategoryEntity;
    payee?: import("../types/models").PayeeEntity;
    schedule?: import("../types/models").ScheduleEntity;
    subtransactions?: TransactionEntity[];
    sort_order?: number;
    tombstone?: boolean;
    imported_payee?: string;
    date: string;
    notes?: string;
    amount: number;
    cleared?: boolean;
    reconciled?: boolean;
    is_parent?: boolean;
    is_child?: boolean;
    parent_id?: string;
    imported_id?: string;
    starting_balance_flag?: boolean;
    transfer_id?: string;
}[];
export {};
