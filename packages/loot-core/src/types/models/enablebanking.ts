export function isErrorResponse(response:any): response is ErrorResponse {
  return (<ErrorResponse>response).error_type !== undefined && (<ErrorResponse> response).error_code !== undefined;
}

export type ErrorResponse = {
    error_code:string,
    error_type?:string,
}

export type EnableBankingBank = {
    name: string;
    logo: string;
    BIC: string;
    country: string;
}

export type EnableBankingToken = {
  bank_id: string;
  session_id: string;
  accounts: SyncServerEnableBankingAccount[];
};

export type SyncServerEnableBankingAccount = {
    account_id:string;
    name: string;
    institution:string;
    balance:number;
}