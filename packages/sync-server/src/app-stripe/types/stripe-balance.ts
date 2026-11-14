import type { StripeBalanceAmount } from './stripe-balance-amount';

export type StripeBalance = {
  available: StripeBalanceAmount[];
  pending: StripeBalanceAmount[];
};
