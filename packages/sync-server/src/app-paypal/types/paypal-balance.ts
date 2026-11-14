import type { PayPalMoney } from './paypal-money';

export type PayPalBalance = {
  currency: string;
  primary?: boolean;
  total_balance: PayPalMoney;
  available_balance?: PayPalMoney;
};
