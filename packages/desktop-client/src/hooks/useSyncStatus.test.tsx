import type { ReactNode } from 'react';

import {
  clearServer,
  initServer,
  serverPush,
} from '@actual-app/core/platform/client/connection';
import type { MetadataPrefs } from '@actual-app/core/types/prefs';
import type { ServerEvents } from '@actual-app/core/types/server-events';
import {
  act,
  render,
  renderHook,
  screen,
  waitFor,
} from '@testing-library/react';

import { SyncStatusLine } from '#components/sidebar/redesign/SyncStatusLine';
import {
  createTestAppStore,
  createTestQueryClient,
  TestProviders,
} from '#mocks';
import { mergeLocalPrefs } from '#prefs/prefsSlice';

import { useSyncStatus } from './useSyncStatus';

vi.mock(
  '@actual-app/core/platform/client/connection',
  () => import('#mocks/connection'),
);
vi.mock('./useSyncServerStatus', () => ({
  useSyncServerStatus: () => 'online',
}));

const pending = {
  id: 'transition',
  sourceGroupId: 'group',
  sourceEncoding: null,
  targetEncoding: '{"version":1,"currencyCode":"JPY","precision":0}',
  targetCurrencyCode: 'JPY',
} satisfies NonNullable<MetadataPrefs['amountEncodingTransition']>;

function setup(
  amountEncodingTransition?: MetadataPrefs['amountEncodingTransition'],
) {
  const store = createTestAppStore();
  store.dispatch(
    mergeLocalPrefs({ cloudFileId: 'cloud', amountEncodingTransition }),
  );
  const wrapper = ({ children }: { children: ReactNode }) => (
    <TestProviders store={store}>{children}</TestProviders>
  );
  return { store, wrapper };
}

async function publish(event: ServerEvents['sync-event']) {
  await act(async () => {
    serverPush('sync-event', event);
    await Promise.resolve();
    await Promise.resolve();
  });
}

beforeEach(async () => {
  await clearServer();
  initServer({});
});

it('shows a saved pending transition on mount and clears it after publication', () => {
  const { store, wrapper } = setup(pending);
  const { result } = renderHook(() => useSyncStatus(), { wrapper });
  expect(result.current.syncState).toBe('pending-transition');
  act(() => {
    store.dispatch(mergeLocalPrefs({ amountEncodingTransition: undefined }));
  });
  expect(result.current.syncState).toBeNull();
});

it('keeps a saved pending transition visible when sync starts or succeeds', async () => {
  const { wrapper } = setup(pending);
  const { result } = renderHook(() => useSyncStatus(), { wrapper });
  await publish({ type: 'start' });
  expect(result.current).toEqual({
    isSyncing: true,
    syncState: 'pending-transition',
  });
  await publish({ type: 'success', tables: [] });
  expect(result.current).toEqual({
    isSyncing: false,
    syncState: 'pending-transition',
  });
});

it('ends the syncing animation with a distinct pending outcome', async () => {
  const { wrapper } = setup();
  const { result } = renderHook(() => useSyncStatus(), { wrapper });
  await publish({ type: 'start' });
  expect(result.current.isSyncing).toBe(true);
  await publish({ type: 'pending-transition' });
  expect(result.current).toEqual({
    isSyncing: false,
    syncState: 'pending-transition',
  });
});

it('keeps disabled and offline outcomes distinct from pending', async () => {
  const { wrapper } = setup(pending);
  const { result } = renderHook(() => useSyncStatus(), { wrapper });
  await publish({ type: 'success', tables: [], syncDisabled: true });
  expect(result.current.syncState).toBe('disabled');
  await publish({ type: 'error', subtype: 'network' });
  expect(result.current.syncState).toBe('offline');
});

it('does not label a persisted pending transition as synced in the sidebar', () => {
  const { wrapper } = setup(pending);
  render(<SyncStatusLine />, { wrapper });
  expect(screen.queryByText('Synced')).not.toBeInTheDocument();
  expect(screen.getByText('Currency change pending')).toBeInTheDocument();
});

it('refreshes pending metadata from the server event so publication can clear the state', async () => {
  // prefsSlice keeps the connection binding from its first evaluation, which
  // is the real worker client. Reload it after the mock is installed.
  vi.resetModules();
  const { initServer: initFreshServer, serverPush: pushFresh } =
    await import('@actual-app/core/platform/client/connection');
  const { listenForSyncEvent: listenFresh } = await import('../sync-events');
  const { store, wrapper } = setup();
  act(() => {
    store.dispatch(mergeLocalPrefs({ id: 'budget' }));
  });
  initFreshServer({
    'load-prefs': async () => ({
      id: 'budget',
      cloudFileId: 'cloud',
      amountEncodingTransition: pending,
    }),
    'load-global-prefs': async () => ({}),
    'preferences/get': async () => ({}),
  });
  const unlisten = listenFresh(store, createTestQueryClient());
  const { result } = renderHook(() => useSyncStatus(), { wrapper });
  await act(async () => {
    pushFresh('sync-event', { type: 'pending-transition' });
    await Promise.resolve();
    await Promise.resolve();
  });
  await waitFor(() =>
    expect(store.getState().prefs.local.amountEncodingTransition).toEqual(
      pending,
    ),
  );
  expect(result.current.syncState).toBe('pending-transition');
  act(() => {
    store.dispatch(mergeLocalPrefs({ amountEncodingTransition: undefined }));
  });
  expect(result.current.syncState).toBeNull();
  unlisten();
});
