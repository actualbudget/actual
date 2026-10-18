export type ExchangeRateEntity = {
  id: string;
  from_currency: string;
  to_currency: string;
  // 1 unit of `from_currency` equals `rate` units of `to_currency`
  rate: number;
  date: string;
  source: string;
  created_at: number | null;
  tombstone?: boolean;
};
