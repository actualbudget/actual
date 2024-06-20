import { TransactionEntity } from '../../types/models';
export declare function batchUpdateTransactions({ added, deleted, updated, learnCategories, detectOrphanPayees, runTransfers, }: {
    added?: Array<{
        id: string;
        payee: unknown;
        category: unknown;
    }>;
    deleted?: Array<{
        id: string;
        payee: unknown;
    }>;
    updated?: Array<{
        id: string;
        payee?: unknown;
        account?: unknown;
        category?: unknown;
    }>;
    learnCategories?: boolean;
    detectOrphanPayees?: boolean;
    runTransfers?: boolean;
}): Promise<{
    added: TransactionEntity[];
    updated: TransactionEntity[] | ({
        id: any;
        transfer_id: any;
    } | {
        id: any;
        payee: any;
    } | {
        id: any;
        category: any;
    })[];
}>;
