import * as connection from '@actual-app/core/platform/client/connection';
import type { ServerEvents } from '@actual-app/core/types/server-events';
import type { QueryClient } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AppStore } from './redux/store';
import { dashboardQueries, reportQueries } from './reports';
import { listenForSyncEvent } from './sync-events';

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

function setup() {
  vi.spyOn(connection, 'listen').mockImplementation(
    // The real `listen` is overloaded per event name; the mock only needs
    // to record the handler
    mockListen as unknown as typeof connection.listen,
  );

  const invalidateQueries = vi.fn();
  const queryClient = { invalidateQueries } as unknown as QueryClient;

  // A budget must be loaded for the table -> invalidate mapping to run
  const store = {
    getState: () => ({
      prefs: { local: { id: 'budget-id' } },
      app: { loadingText: null },
    }),
    dispatch: vi.fn(),
  } as unknown as AppStore;

  listenForSyncEvent(store, queryClient);

  return { invalidateQueries };
}

function appliedEvent(tables: string[]): ServerEvents['sync-event'] {
  return { type: 'applied', tables } as ServerEvents['sync-event'];
}

describe('listenForSyncEvent', () => {
  beforeEach(() => {
    eventListeners.clear();
    vi.clearAllMocks();
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
});
