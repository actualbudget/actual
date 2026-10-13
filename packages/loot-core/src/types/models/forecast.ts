export type ForecastSource = 'schedules' | 'tracking-budget';

export type ForecastAssumptions = {
  anchorDate: string;
  /** Annual rates as decimal fractions, entered by the user. */
  inflationRate: number;
  salaryGrowthRate: number;
  incomeScheduleIds: string[];
};

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
  source?: ForecastSource;
  tombstone?: boolean;
};

export type ForecastResult = {
  dataPoints: ForecastDataPoint[];
  /** A separate nominal projection; the original data points stay unchanged. */
  scenario?: {
    assumptions: ForecastAssumptions;
    dataPoints: ForecastDataPoint[];
  };
  lowestBalance: {
    date: string;
    balance: number;
    accountId: string;
    accountName: string;
  };
  forecastStartDate: string;
  forecastEndDate: string;
};
