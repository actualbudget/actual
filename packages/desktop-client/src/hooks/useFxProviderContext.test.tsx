import type { ReactNode } from 'react';

import { serverPush } from '@actual-app/core/platform/client/connection';
import { act, renderHook, waitFor } from '@testing-library/react';

import {
  createTestAppStore,
  createTestQueryClient,
  TestProviders,
} from '#mocks';
import { contextA, contextB, fxServer } from '#mocks/fxHistory';
import { mergeLocalPrefs } from '#prefs/prefsSlice';

import { useFxProviderContext } from './useFxProviderContext';

vi.mock(
  '@actual-app/core/platform/client/connection',
  () => import('#mocks/connection'),
);

function setup() {
  const server = fxServer();
  const store = createTestAppStore();
  store.dispatch(mergeLocalPrefs({ id: 'file-a' }));
  const wrapper = ({ children }: { children: ReactNode }) => (
    <TestProviders store={store} queryClient={createTestQueryClient()}>
      {children}
    </TestProviders>
  );
  const hook = renderHook(() => useFxProviderContext(), { wrapper });
  return { server, store, hook };
}

it('starts empty and reads nothing from the server', async () => {
  const { server, hook } = setup();
  await new Promise(resolve => setTimeout(resolve, 20));
  expect(hook.result.current.context).toBeNull();
  expect(hook.result.current.current()).toBeNull();
  expect(server.names()).toEqual([]);
});

it('seeds from a local reply only while it has no context', async () => {
  const { hook } = setup();
  act(() => hook.result.current.observe(contextA));
  expect(hook.result.current.context).toBe(contextA);
  const epoch = hook.result.current.epoch;
  // A later reply with an older context never replaces the current one.
  act(() => hook.result.current.observe(contextB));
  expect(hook.result.current.context).toBe(contextA);
  expect(hook.result.current.epoch).toBe(epoch);
});

it('follows the context event and never resurrects an older context', async () => {
  const { hook } = setup();
  act(() => hook.result.current.observe(contextA));
  const epoch = hook.result.current.epoch;
  serverPush('fx-provider-context', { context: contextB });
  await waitFor(() => expect(hook.result.current.context).toBe(contextB));
  expect(hook.result.current.current()).toBe(contextB);
  expect(hook.result.current.epoch).toBe(epoch + 1);
  act(() => hook.result.current.observe(contextA));
  expect(hook.result.current.context).toBe(contextB);
});

it('clears the context when the budget changes', async () => {
  const { store, hook } = setup();
  act(() => hook.result.current.observe(contextA));
  const before = hook.result.current;
  act(() => {
    store.dispatch(mergeLocalPrefs({ id: 'file-b' }));
  });
  await waitFor(() => expect(hook.result.current.context).toBeNull());
  expect(hook.result.current.epoch).toBeGreaterThan(before.epoch);
  // A reply that began under the old budget sees no current context.
  expect(before.current()).toBeNull();
  before.observe(contextA);
  expect(hook.result.current.context).toBeNull();
});
