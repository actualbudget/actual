import type { QueryState } from '#shared/query';

export type ServerHandlers = {
  undo: () => Promise<void>;
  redo: () => Promise<void>;

  'make-filters-from-conditions': (arg: {
    conditions: unknown;
    applySpecialCases?: boolean;
    /** Field compared by amount conditions (a foreign schedule's native). */
    amountField?: 'amount' | 'transaction_amount';
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
};
