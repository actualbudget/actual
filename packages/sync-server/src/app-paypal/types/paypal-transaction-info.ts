import type { PayPalMoney } from './paypal-money';

export type PayPalTransactionInfo = {
  transaction_id: string;
  transaction_event_code?: string;
  transaction_initiation_date: string;
  transaction_amount: PayPalMoney;
  fee_amount?: PayPalMoney;
  transaction_status?: string;
  transaction_subject?: string;
  transaction_note?: string;
  invoice_id?: string;
};
