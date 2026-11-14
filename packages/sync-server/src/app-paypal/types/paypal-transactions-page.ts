import type { PayPalTransactionDetail } from './paypal-transaction-detail';

export type PayPalTransactionsPage = {
  transaction_details?: PayPalTransactionDetail[];
  total_pages?: number;
  page?: number;
};
