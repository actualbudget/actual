import {
  initServer,
  serverPush,
} from '@actual-app/core/platform/client/connection';
import { waitFor } from '@testing-library/react';

import { createTestAppStore, createTestQueryClient } from '#mocks';
import { setPrefs } from '#prefs/prefsSlice';

import { listenForSyncEvent } from './sync-events';

vi.mock(
  '@actual-app/core/platform/client/connection',
  () => import('#mocks/connection'),
);

describe('sync events', () => {
  it('reloads synced preferences changed on another device', async () => {
    initServer({
      'preferences/get': async () => ({
        'flags.multicurrency': 'true',
        defaultCurrencyCode: 'USD',
      }),
    });
    const store = createTestAppStore();
    // Sync events apply only while a budget is open.
    store.dispatch(
      setPrefs({ local: { id: 'budget' }, global: {}, synced: {} }),
    );
    const unlisten = listenForSyncEvent(store, createTestQueryClient());
    onTestFinished(unlisten);
    expect(store.getState().prefs.synced['flags.multicurrency']).toBeFalsy();

    serverPush('sync-event', { type: 'applied', tables: ['preferences'] });
    await waitFor(() =>
      expect(store.getState().prefs.synced['flags.multicurrency']).toBe('true'),
    );
  });
});
