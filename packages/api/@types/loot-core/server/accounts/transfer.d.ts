export declare function addTransfer(transaction: any, transferredAccount: any): Promise<{
    id: any;
    payee: any;
} | {
    category?: any;
    id: any;
    transfer_id: any;
    payee?: undefined;
}>;
export declare function removeTransfer(transaction: any): Promise<{
    id: any;
    transfer_id: any;
}>;
export declare function updateTransfer(transaction: any, transferredAccount: any): Promise<{
    id: any;
    category: any;
}>;
export declare function onInsert(transaction: any): Promise<{
    id: any;
    payee: any;
} | {
    category?: any;
    id: any;
    transfer_id: any;
    payee?: undefined;
}>;
export declare function onDelete(transaction: any): Promise<void>;
export declare function onUpdate(transaction: any): Promise<{
    id: any;
    transfer_id: any;
} | {
    id: any;
    payee: any;
} | {
    id: any;
    category: any;
}>;
