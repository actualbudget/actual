import { beforeEach, describe, expect, it, vi } from 'vitest';

import { markUpdatedAccounts } from './accounts/accountsSlice';
import { listenForSyncEvent } from './sync-events';

const listeners = new Map<string, Array<(event: unknown) => void>>();

vi.mock('@actual-app/core/platform/client/connection', () => ({
  listen: vi.fn((name: string, listener: (event: unknown) => void) => {
    const current = listeners.get(name) ?? [];
    current.push(listener);
    listeners.set(name, current);
    return () => {
      listeners.set(
        name,
        (listeners.get(name) ?? []).filter(l => l !== listener),
      );
    };
  }),
  send: vi.fn(),
}));

function emitSyncEvent(event: unknown) {
  for (const listener of listeners.get('sync-event') ?? []) {
    listener(event);
  }
}

describe('listenForSyncEvent', () => {
  beforeEach(() => {
    listeners.clear();
  });

  it('marks accounts updated from explicit applied sync metadata', () => {
    const dispatch = vi.fn();
    const store = {
      dispatch,
      getState: () => ({
        prefs: {
          local: {
            id: 'budget-1',
          },
        },
      }),
    };
    const queryClient = {
      invalidateQueries: vi.fn(),
    };

    listenForSyncEvent(store as never, queryClient as never);

    emitSyncEvent({
      type: 'applied',
      tables: ['accounts', 'transactions'],
      meta: {
        updatedAccountIds: ['acct-2'],
      },
    });

    expect(dispatch).toHaveBeenCalledWith(
      markUpdatedAccounts({ ids: ['acct-2'] }),
    );
  });

  it('does not infer updated accounts from generic applied transaction rows', () => {
    const dispatch = vi.fn();
    const store = {
      dispatch,
      getState: () => ({
        prefs: {
          local: {
            id: 'budget-1',
          },
        },
      }),
    };
    const queryClient = {
      invalidateQueries: vi.fn(),
    };

    listenForSyncEvent(store as never, queryClient as never);

    emitSyncEvent({
      type: 'applied',
      tables: ['transactions'],
      data: new Map([
        [
          'transactions',
          new Map([
            ['t1', { id: 't1', acct: 'acct-1' }],
            ['t2', { id: 't2', acct: 'acct-2' }],
          ]),
        ],
      ]),
    });

    expect(dispatch).not.toHaveBeenCalledWith(
      markUpdatedAccounts({ ids: ['acct-2'] }),
    );
  });

  it('ignores invalid updated account metadata', () => {
    const dispatch = vi.fn();
    const store = {
      dispatch,
      getState: () => ({
        prefs: {
          local: {
            id: 'budget-1',
          },
        },
      }),
    };
    const queryClient = {
      invalidateQueries: vi.fn(),
    };

    listenForSyncEvent(store as never, queryClient as never);

    emitSyncEvent({
      type: 'applied',
      tables: ['accounts', 'transactions'],
      meta: {
        updatedAccountIds: ['acct-1', null, 123],
      },
    });

    expect(dispatch).toHaveBeenCalledWith(
      markUpdatedAccounts({ ids: ['acct-1'] }),
    );
  });
});
