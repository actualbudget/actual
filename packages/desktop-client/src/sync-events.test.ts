import * as connection from '@actual-app/core/platform/client/connection';
import type { ServerEvents } from '@actual-app/core/types/server-events';
import type { QueryClient } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { budgetBoundsQueries } from './budget';
import type { AppStore } from './redux/store';
import { dashboardQueries, reportQueries } from './reports';
import { listenForSyncEvent } from './sync-events';
import type * as UsersSlice from './users/usersSlice';

const eventListeners = new Map<string, Array<(args: unknown) => void>>();

function mockListen(name: string, listener: (args: unknown) => void) {
  const listeners = eventListeners.get(name) ?? [];
  listeners.push(listener);
  eventListeners.set(name, listeners);

  return () => {
    eventListeners.set(
      name,
      (eventListeners.get(name) ?? []).filter(l => l !== listener),
    );
  };
}

function publishSyncEvent(event: ServerEvents['sync-event']) {
  (eventListeners.get('sync-event') ?? []).forEach(listener => listener(event));
}

function setup({ isOffline }: { isOffline?: boolean } = {}) {
  vi.spyOn(connection, 'listen').mockImplementation(
    // The real `listen` is overloaded per event name; the mock only needs
    // to record the handler
    mockListen as unknown as typeof connection.listen,
  );

  const invalidateQueries = vi.fn();
  const queryClient = { invalidateQueries } as unknown as QueryClient;

  const dispatch = vi.fn();
  // A budget must be loaded for the table -> invalidate mapping to run
  const store = {
    getState: () => ({
      prefs: { local: { id: 'budget-id' } },
      app: { loadingText: null },
      user: { data: isOffline === undefined ? null : { offline: isOffline } },
    }),
    dispatch,
  } as unknown as AppStore;

  listenForSyncEvent(store, queryClient);

  return { invalidateQueries, dispatch };
}

vi.mock('./users/usersSlice', async importOriginal => ({
  ...(await importOriginal<typeof UsersSlice>()),
  getUserData: () => getUserDataAction,
}));

const getUserDataAction = { type: 'user/getUserData' };

function appliedEvent(tables: string[]): ServerEvents['sync-event'] {
  return { type: 'applied', tables } as ServerEvents['sync-event'];
}

describe('listenForSyncEvent', () => {
  beforeEach(() => {
    eventListeners.clear();
    vi.clearAllMocks();
  });

  it.each([
    'zero_budgets',
    'reflect_budgets',
    'transactions',
    'categories',
    'preferences',
  ])('refreshes budget bounds after %s changes', table => {
    const { invalidateQueries } = setup();
    publishSyncEvent(appliedEvent([table]));
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: budgetBoundsQueries.all(),
    });
  });

  it('leaves budget bounds alone for unrelated changes', () => {
    const { invalidateQueries } = setup();
    publishSyncEvent(appliedEvent(['payees']));
    expect(invalidateQueries).not.toHaveBeenCalledWith({
      queryKey: budgetBoundsQueries.all(),
    });
  });

  it('invalidates the dashboard queries when widgets sync', () => {
    const { invalidateQueries } = setup();

    publishSyncEvent(appliedEvent(['dashboard']));

    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: dashboardQueries.lists(),
    });
  });

  it('invalidates the dashboard queries when dashboard pages sync', () => {
    const { invalidateQueries } = setup();

    publishSyncEvent(appliedEvent(['dashboard_pages']));

    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: dashboardQueries.lists(),
    });
  });

  it('invalidates the report queries when custom reports sync', () => {
    const { invalidateQueries } = setup();

    publishSyncEvent(appliedEvent(['custom_reports']));

    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: reportQueries.lists(),
    });
  });

  it('leaves the dashboard and report queries alone for unrelated tables', () => {
    const { invalidateQueries } = setup();

    publishSyncEvent(appliedEvent(['transactions']));

    expect(invalidateQueries).not.toHaveBeenCalledWith({
      queryKey: dashboardQueries.lists(),
    });
    expect(invalidateQueries).not.toHaveBeenCalledWith({
      queryKey: reportQueries.lists(),
    });
  });

  it.each([
    { type: 'success', isOffline: true },
    { type: 'error', isOffline: false },
  ] as const)(
    'refreshes the user data on $type when the status says offline=$isOffline',
    ({ type, isOffline }) => {
      const { dispatch } = setup({ isOffline });

      publishSyncEvent({ type, tables: [] } as ServerEvents['sync-event']);

      expect(dispatch).toHaveBeenCalledWith(getUserDataAction);
    },
  );

  it.each([
    { type: 'success', isOffline: false },
    { type: 'error', isOffline: true },
    { type: 'success', isOffline: undefined },
  ] as const)(
    'leaves the user data alone on $type when the status says offline=$isOffline',
    ({ type, isOffline }) => {
      const { dispatch } = setup({ isOffline });

      publishSyncEvent({ type, tables: [] } as ServerEvents['sync-event']);

      expect(dispatch).not.toHaveBeenCalledWith(getUserDataAction);
    },
  );
});
