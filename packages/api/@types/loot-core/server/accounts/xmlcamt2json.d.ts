interface TransactionCAMT {
    amount: number;
    date: string;
    payee_name: string | null;
    imported_payee: string | null;
    notes: string | null;
    imported_id?: string;
}
export declare function xmlCAMT2json(content: string): Promise<TransactionCAMT[]>;
export {};
