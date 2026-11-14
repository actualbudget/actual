import type { PayPalPayerInfo } from './paypal-payer-info';
import type { PayPalTransactionInfo } from './paypal-transaction-info';

export type PayPalTransactionDetail = {
  transaction_info: PayPalTransactionInfo;
  payer_info?: PayPalPayerInfo;
};
