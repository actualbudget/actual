import type { UndoAvailability } from '#server/undo';
import type { QueryState } from '#shared/query';

export type ServerHandlers = {
  undo: () => Promise<void>;
  redo: () => Promise<void>;
  'undo-availability': () => Promise<UndoAvailability>;

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
};
