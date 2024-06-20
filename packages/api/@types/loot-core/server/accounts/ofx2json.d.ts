type OFXTransaction = {
    amount: string;
    fitId: string;
    name: string;
    date: string;
    memo: string;
    type: string;
};
type OFXParseResult = {
    headers: Record<string, unknown>;
    transactions: OFXTransaction[];
};
export declare function ofx2json(ofx: string): Promise<OFXParseResult>;
export {};
