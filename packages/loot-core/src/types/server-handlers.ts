import { type QueryState } from '../shared/query';

export type ServerHandlers = {
  undo: () => Promise<void>;
  redo: () => Promise<void>;

  'make-filters-from-conditions': (arg: {
    conditions: unknown;
    applySpecialCases?: boolean;
  }) => Promise<{ filters: unknown[] }>;

  // oxlint-disable-next-line typescript/no-explicit-any
  query: (query: QueryState) => Promise<{ data: any; dependencies: string[] }>;

  'get-server-version': () => Promise<
    { error: 'no-server' } | { error: 'network-failure' } | { version: string }
  >;

  'get-server-url': () => Promise<string | null>;

  'set-server-url': (arg: {
    url: string;
    validate?: boolean;
  }) => Promise<{ error?: string }>;

  'app-focused': () => Promise<void>;

  'get-openexchangerates-usage': () => Promise<{
    planName: string;
    quota: string;
    requests: number;
    requestsQuota: number;
    requestsRemaining: number;
    daysRemaining: number;
    dailyAverage: number;
  } | null>;

  'exchange-rates-fetch': (arg: {
    fromCurrency?: string;
    toCurrencies?: string[];
  }) => Promise<{ success: boolean }>;

  'get-exchange-rate': (arg: {
    fromCurrency: string;
    toCurrency: string;
    date?: string;
  }) => Promise<number | null>;

  'exchange-rates-get-update-interval': () => Promise<number>;
};
