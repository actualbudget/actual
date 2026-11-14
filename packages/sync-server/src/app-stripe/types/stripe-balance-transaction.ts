export type StripeBalanceTransaction = {
  id: string;
  amount: number;
  fee: number;
  net: number;
  currency: string;
  created: number;
  description?: string | null;
  source?: string | null;
  status: string;
  type: string;
  reporting_category?: string;
};
