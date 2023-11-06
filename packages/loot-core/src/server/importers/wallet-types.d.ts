/* eslint-disable import/no-unused-modules */
export namespace Wallet {
  export type Transactions = Transaction[];

  export interface Transaction {
    id: string;
    account: string;
    // eslint-disable-next-line @typescript-eslint/ban-types
    category: 'TRANSFER' | (string & {});
    currency: string;
    amount: number;
    ref_currency_amount: string;
    type: string;
    payment_type: string;
    payment_type_local: string;
    note: string;
    date: string;
    gps_latitude: string;
    gps_longitude: string;
    gps_accuracy_in_meters: string;
    warranty_in_month: string;
    transfer: string;
    payee: string;
    labels: string;
    envelope_id: string;
    custom_category: string;
  }
}
