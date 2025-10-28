export type ExchangeRateProvider = {
  name: string;
  fetchRates(
    baseCurrency: string,
    targetCurrencies: string[],
  ): Promise<ExchangeRateData[]>;
  supportsHistory: boolean;
  fetchHistoricalRate?(
    from: string,
    to: string,
    date: string,
  ): Promise<number | null>;
};

export type ExchangeRateData = {
  from_currency: string;
  to_currency: string;
  rate: number;
  date: string;
  source: string;
  timestamp?: string; // Optional provider-specific timestamp
};

export type ExchangeRateEntity = {
  id: string;
  from_currency: string;
  to_currency: string;
  rate: number;
  date: string; // ISO date (YYYY-MM-DD)
  timestamp: string; // ISO datetime when rate was fetched
  source: string;
};
