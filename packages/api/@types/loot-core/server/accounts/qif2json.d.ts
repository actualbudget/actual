type Division = {
    category?: string;
    subcategory?: string;
    description?: string;
    amount?: number;
};
type QIFTransaction = {
    date?: string;
    amount?: string;
    number?: string;
    memo?: string;
    address?: string[];
    clearedStatus?: string;
    category?: string;
    subcategory?: string;
    payee?: string;
    division?: Division[];
};
export declare function qif2json(qif: any, options?: {
    dateFormat?: string;
}): {
    dateFormat: string | undefined;
    type?: any;
    transactions: QIFTransaction[];
};
export {};
