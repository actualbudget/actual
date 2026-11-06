import * as undo from '@actual-app/core/platform/client/undo';
import { QueryClient } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { handleGlobalEvents } from './global-events';
import type { AppStore } from './redux/store';

const { listeners } = vi.hoisted(() => ({
  listeners: new Map<
    string,
    (state: { tables: string[]; undoTag: string }) => void
  >(),
}));

vi.mock('@actual-app/core/platform/client/connection', () => ({
  listen: (
    event: string,
    callback: (state: { tables: string[]; undoTag: string }) => void,
  ) => {
    listeners.set(event, callback);
    return vi.fn();
  },
}));
vi.mock('./accounts', () => ({ accountQueries: {} }));
vi.mock('./app/appSlice', () => ({ setAppState: vi.fn() }));
vi.mock('./budget', () => ({ categoryQueries: {} }));
vi.mock('./budgetfiles/budgetfilesSlice', () => ({ closeBudgetUI: vi.fn() }));
vi.mock('./modals/modalsSlice', () => ({
  closeModal: vi.fn(),
  pushModal: vi.fn(),
  replaceModal: vi.fn(),
}));
vi.mock('./notifications/notificationsSlice', () => ({
  addGenericErrorNotification: vi.fn(),
  addNotification: vi.fn(),
}));
vi.mock('./payees', () => ({ payeeQueries: {} }));
vi.mock('./prefs/prefsSlice', () => ({ loadPrefs: vi.fn() }));
vi.mock('./reports', () => ({ dashboardQueries: {}, reportQueries: {} }));
vi.mock('./sync-events', () => ({ listenForSyncEvent: () => vi.fn() }));

describe('undo navigation', () => {
  beforeEach(() => {
    window.__navigate = vi.fn();
    const store = { dispatch: vi.fn() } as unknown as AppStore;
    handleGlobalEvents(store, new QueryClient());
  });

  afterEach(() => {
    listeners.clear();
    vi.unstubAllEnvs();
  });

  async function undoAt(currentUrl: string, taggedUrl: string) {
    window.history.replaceState(null, '', currentUrl);
    undo.setUndoState('url', taggedUrl);
    undo.setUndoState('openModal', null);
    const undoTag = undo.snapshot();
    listeners.get('undo-event')?.({ tables: [], undoTag });
    await Promise.resolve();
    undo.gc(undoTag);
  }

  it('does not navigate when the stored browser URL is already current', async () => {
    vi.stubEnv('BASE_URL', '/finances/');
    await undoAt(
      '/finances/budget?month=2026-11#total',
      '/finances/budget?month=2026-11#total',
    );
    expect(window.__navigate).not.toHaveBeenCalled();
  });

  it.each(['/', '/finances/', '/nested/finances/'])(
    'navigates relative to the router basename %s, preserving query and hash',
    async basePath => {
      vi.stubEnv('BASE_URL', basePath);
      await undoAt(
        `${basePath}budget`,
        `${basePath}accounts?filter=active#balance`,
      );
      expect(window.__navigate).toHaveBeenCalledExactlyOnceWith(
        '/accounts?filter=active#balance',
      );
    },
  );
});
