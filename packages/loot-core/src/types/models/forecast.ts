export type ForecastDataPoint = {
  date: string;
  balance: number;
  accountId: string;
  accountName: string;
  transactions: ForecastTransaction[];
};

export type ForecastTransaction = {
  amount: number;
  payee: string | null;
  scheduleId: string;
  scheduleName: string;
};

export type BalanceForecastConfig = {
  id: string;
  name: string;
  forecastMonths: number;
  selectedAccounts: string[];
  showCombined: boolean;
  showIndividual: boolean;
  tombstone?: boolean;
};

export type ForecastResult = {
  dataPoints: ForecastDataPoint[];
  lowestBalance: {
    date: string;
    balance: number;
    accountId: string;
    accountName: string;
  };
  forecastStartDate: string;
  forecastEndDate: string;
};
