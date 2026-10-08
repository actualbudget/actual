import type { ReactNode } from 'react';

import { generateAccount } from '@actual-app/core/mocks';
import type { TransactionEntity } from '@actual-app/core/types/models';
import { act, renderHook } from '@testing-library/react';

import {
  createTestAppStore,
  createTestQueryClient,
  TestProviders,
} from '#mocks';
import { mergeLocalPrefs } from '#prefs/prefsSlice';
import { aqlQuery } from '#queries/aqlQuery';

import { useOpenAmountDetails } from './useOpenAmountDetails';

vi.mock('#queries/aqlQuery', () => ({ aqlQuery: vi.fn() }));
vi.mock('#hooks/useAccounts', () => ({
  useAccounts: () => ({
    data: [
      {
        ...generateAccount('Yen'),
        id: 'yen',
        currency: 'JPY',
        currency_precision: 0,
      },
    ],
  }),
}));
vi.mock('#hooks/usePayees', () => ({ usePayees: () => ({ data: [] }) }));

const row: TransactionEntity = {
  id: 'tx',
  account: 'yen',
  date: '2026-01-01',
  amount: -100,
  transaction_amount: -150,
};

function setup() {
  let finish: (value: Awaited<ReturnType<typeof aqlQuery>>) => void = () =>
    undefined;
  const read = new Promise<Awaited<ReturnType<typeof aqlQuery>>>(resolve => {
    finish = resolve;
  });
  vi.mocked(aqlQuery).mockReturnValue(read);
  const store = createTestAppStore();
  store.dispatch(mergeLocalPrefs({ id: 'budget-a' }));
  const queryClient = createTestQueryClient();
  const hook = renderHook(useOpenAmountDetails, {
    wrapper: ({ children }: { children: ReactNode }) => (
      <TestProviders store={store} queryClient={queryClient}>
        {children}
      </TestProviders>
    ),
  });
  return { ...hook, store, finish };
}

it('ignores a details reply after the budget changes', async () => {
  const { result, store, finish } = setup();
  const pending = result.current('tx');
  act(() => {
    store.dispatch(mergeLocalPrefs({ id: 'budget-b' }));
  });
  await act(async () => {
    finish({ data: [row], dependencies: [] });
    await pending;
  });
  expect(store.getState().modals.modalStack).toEqual([]);
});

it('ignores a details reply after its menu unmounts', async () => {
  const { result, store, finish, unmount } = setup();
  const pending = result.current('tx');
  unmount();
  await act(async () => {
    finish({ data: [row], dependencies: [] });
    await pending;
  });
  expect(store.getState().modals.modalStack).toEqual([]);
});

it('ignores an older reply after a newer details request', async () => {
  const { result, store, finish } = setup();
  const pending = result.current('tx');
  vi.mocked(aqlQuery).mockResolvedValueOnce({
    data: [{ ...row, id: 'tx2' }],
    dependencies: [],
  });
  await act(async () => {
    await result.current('tx2');
  });
  await act(async () => {
    finish({ data: [row], dependencies: [] });
    await pending;
  });
  expect(store.getState().modals.modalStack).toEqual([
    expect.objectContaining({
      name: 'foreign-amount',
      options: expect.objectContaining({
        edit: expect.objectContaining({ id: 'tx2' }),
      }),
    }),
  ]);
});

it('ignores a transfer counterpart reply after the budget changes', async () => {
  const { result, store, finish } = setup();
  vi.mocked(aqlQuery).mockResolvedValueOnce({
    data: [{ ...row, transfer_id: 'other' }],
    dependencies: [],
  });
  let pending: Promise<void> = Promise.resolve();
  await act(async () => {
    pending = result.current('tx');
  });
  act(() => {
    store.dispatch(mergeLocalPrefs({ id: 'budget-b' }));
  });
  await act(async () => {
    finish({ data: [{ ...row, id: 'other' }], dependencies: [] });
    await pending;
  });
  expect(store.getState().modals.modalStack).toEqual([]);
});
