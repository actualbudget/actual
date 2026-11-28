import type { ReactNode } from 'react';

import {
  initServer,
  serverPush,
} from '@actual-app/core/platform/client/connection';
import * as monthUtils from '@actual-app/core/shared/months';
import { onlineManager } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';

import {
  createTestAppStore,
  createTestQueryClient,
  TestProviders,
} from '#mocks';
import { fxValuationFixture } from '#mocks/fxValuation';
import { mergeLocalPrefs, mergeSyncedPrefs } from '#prefs/prefsSlice';

import { useFxValuation } from './useFxValuation';

vi.mock(
  '@actual-app/core/platform/client/connection',
  () => import('#mocks/connection'),
);

function setup(read = vi.fn().mockResolvedValue(fxValuationFixture)) {
  initServer({ 'budget/fx-valuation': read });
  const store = createTestAppStore();
  store.dispatch(mergeLocalPrefs({ id: 'file-a' }));
  store.dispatch(mergeSyncedPrefs({ amountEncoding: 'encoding-a' }));
  const queryClient = createTestQueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <TestProviders store={store} queryClient={queryClient}>
      {children}
    </TestProviders>
  );
  return { store, queryClient, wrapper, read };
}

it('isolates month, budget file and recorded encoding without flashing old data', async () => {
  const { wrapper, store, read } = setup();
  const view = renderHook(({ month }) => useFxValuation(month, 6500, false), {
    wrapper,
    initialProps: { month: '2016-12' },
  });
  await waitFor(() =>
    expect(view.result.current.data).toEqual(fxValuationFixture),
  );
  let resolve!: (value: typeof fxValuationFixture) => void;
  read.mockImplementation(
    () =>
      new Promise<typeof fxValuationFixture>(r => {
        resolve = r;
      }),
  );
  view.rerender({ month: '2017-01' });
  expect(view.result.current.data).toBeUndefined();
  await waitFor(() => expect(read).toHaveBeenCalledTimes(2));
  act(() => {
    store.dispatch(mergeLocalPrefs({ id: 'file-b' }));
  });
  expect(view.result.current.data).toBeUndefined();
  await waitFor(() => expect(read).toHaveBeenCalledTimes(3));
  act(() => {
    store.dispatch(mergeSyncedPrefs({ amountEncoding: 'encoding-b' }));
  });
  expect(view.result.current.data).toBeUndefined();
  await waitFor(() => expect(read).toHaveBeenCalledTimes(4));
  act(() => resolve({ ...fxValuationFixture, month: '2017-01' }));
  await waitFor(() => expect(view.result.current.data?.month).toBe('2017-01'));
});

it('reads offline once after applied changes and included-cell changes, and stops after unmount', async () => {
  const { wrapper, read } = setup();
  onlineManager.setOnline(false);
  onTestFinished(() => onlineManager.setOnline(true));
  const view = renderHook(
    ({ amount, incomplete }) => useFxValuation('2016-12', amount, incomplete),
    { wrapper, initialProps: { amount: 6500, incomplete: false } },
  );
  await waitFor(() =>
    expect(view.result.current.data).toEqual(fxValuationFixture),
  );
  for (const table of [
    'transactions',
    'accounts',
    'exchange_rates',
    'preferences',
  ]) {
    const before = read.mock.calls.length;
    serverPush('sync-event', { type: 'applied', tables: [table] });
    await waitFor(() => expect(read).toHaveBeenCalledTimes(before + 1));
  }
  view.rerender({ amount: 7000, incomplete: true });
  await waitFor(() => expect(read).toHaveBeenCalledTimes(6));
  view.unmount();
  serverPush('sync-event', { type: 'applied', tables: ['transactions'] });
  await new Promise(r => setTimeout(r, 20));
  expect(read).toHaveBeenCalledTimes(6);
});

it('refreshes on a local day change', async () => {
  const today = vi
    .spyOn(monthUtils, 'currentDay')
    .mockReturnValue('2017-01-01');
  onTestFinished(() => today.mockRestore());
  const intervals = vi.spyOn(globalThis, 'setInterval');
  onTestFinished(() => intervals.mockRestore());
  const { wrapper, read } = setup();
  renderHook(() => useFxValuation('2016-12', 6500, false), { wrapper });
  await waitFor(() => expect(read).toHaveBeenCalledTimes(1));
  today.mockReturnValue('2017-01-02');
  const tick = intervals.mock.calls.find(([, delay]) => delay === 60_000)?.[0];
  expect(typeof tick).toBe('function');
  act(() => {
    if (typeof tick === 'function') tick();
  });
  await waitFor(() => expect(read).toHaveBeenCalledTimes(2));
});

it('reports failure without retaining a successful valuation or retrying', async () => {
  const read = vi
    .fn()
    .mockResolvedValueOnce(fxValuationFixture)
    .mockRejectedValue(new Error('boom'));
  const { wrapper } = setup(read);
  const { result } = renderHook(() => useFxValuation('2016-12', 6500, false), {
    wrapper,
  });
  await waitFor(() => expect(result.current.data).toEqual(fxValuationFixture));
  serverPush('sync-event', { type: 'applied', tables: ['transactions'] });
  await waitFor(() => expect(result.current.status).toBe('error'));
  expect(result.current.data).toBeUndefined();
  expect(read).toHaveBeenCalledTimes(2);
});

it('discards a result from before midnight when the day changes during the worker read', async () => {
  const today = vi
    .spyOn(monthUtils, 'currentDay')
    .mockReturnValue('2017-01-01');
  onTestFinished(() => today.mockRestore());
  let release!: (data: typeof fxValuationFixture) => void;
  const read = vi
    .fn()
    .mockImplementationOnce(
      () =>
        new Promise<typeof fxValuationFixture>(resolve => {
          release = resolve;
        }),
    )
    .mockResolvedValue({ ...fxValuationFixture, closing: 19000 });
  const { wrapper } = setup(read);
  const { result } = renderHook(() => useFxValuation('2016-12', 6500, false), {
    wrapper,
  });
  expect(result.current.isPending).toBe(true);
  await waitFor(() => expect(read).toHaveBeenCalledTimes(1));
  today.mockReturnValue('2017-01-02');
  await act(async () => {
    release(fxValuationFixture);
  });
  await waitFor(() => expect(result.current.data?.closing).toBe(19000));
  expect(read).toHaveBeenCalledTimes(2);
});

it('reports loading instead of a blank state when a render after midnight masks the old day', async () => {
  const today = vi
    .spyOn(monthUtils, 'currentDay')
    .mockReturnValue('2017-01-01');
  onTestFinished(() => today.mockRestore());
  const { wrapper } = setup();
  const view = renderHook(() => useFxValuation('2016-12', 6500, false), {
    wrapper,
  });
  await waitFor(() =>
    expect(view.result.current.data).toEqual(fxValuationFixture),
  );
  today.mockReturnValue('2017-01-02');
  view.rerender();
  expect(view.result.current.data).toBeUndefined();
  expect(view.result.current.isPending).toBe(true);
  expect(view.result.current.status).toBe('pending');
});
