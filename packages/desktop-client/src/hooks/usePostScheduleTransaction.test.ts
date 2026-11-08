import { initServer } from '@actual-app/core/platform/client/connection';

import { createTestAppStore } from '#mocks';

import { postScheduleTransaction } from './usePostScheduleTransaction';

vi.mock(
  '@actual-app/core/platform/client/connection',
  () => import('#mocks/connection'),
);

const draft = {
  id: 'draft',
  payee: null,
  account: 'jpy',
  transaction_amount: -1500,
  date: '2026-03-08',
  schedule: 'yen',
  cleared: false as const,
};

it('opens the conversion dialog for a foreign schedule without a rate', async () => {
  initServer({
    'schedule/post-transaction': async () => ({
      type: 'rate-unavailable' as const,
      transaction: draft,
      currency: 'JPY',
      precision: 0,
    }),
  });
  const store = createTestAppStore();

  await postScheduleTransaction(store.dispatch, 'yen');

  expect(store.getState().modals.modalStack).toEqual([
    expect.objectContaining({
      name: 'foreign-amount',
      options: expect.objectContaining({
        transaction: draft,
        currencyCode: 'JPY',
        nativePrecision: 0,
      }),
    }),
  ]);
});

it('opens nothing when the occurrence posts', async () => {
  initServer({
    'schedule/post-transaction': async () => ({ type: 'posted' as const }),
  });
  const store = createTestAppStore();
  await postScheduleTransaction(store.dispatch, 'dollars', true);
  expect(store.getState().modals.modalStack).toEqual([]);
});

it('opens the exchange dialog for an exchange without an estimate', async () => {
  const occurrence = {
    schedule: 'rent',
    account: 'usd',
    other: 'jpy',
    date: '2026-03-08',
    amount: -10000,
    notes: null,
    cleared: false,
    category: null,
  };
  initServer({
    'schedule/post-transaction': async () => ({
      type: 'exchange-unavailable' as const,
      reason: 'rate-unavailable' as const,
      currencies: ['JPY'],
      ...occurrence,
    }),
  });
  const store = createTestAppStore();
  await postScheduleTransaction(store.dispatch, 'rent');
  expect(store.getState().modals.modalStack).toEqual([
    expect.objectContaining({
      name: 'exchange-transfer',
      options: { occurrence },
    }),
  ]);
});

it('fetches the occurrence date before opening manual conversion, then retries once', async () => {
  const post = vi
    .fn()
    .mockResolvedValueOnce({
      type: 'rate-unavailable',
      transaction: draft,
      currency: 'JPY',
      precision: 0,
    })
    .mockResolvedValueOnce({ type: 'posted' });
  const ensure = vi.fn(async () => ({
    status: 'cached' as const,
    context: 'test',
    resolution: {
      status: 'resolved' as const,
      rate: '150',
      kind: 'standing' as const,
      source: 'manual',
      timestamp: null,
      fallback: false,
    },
  }));
  initServer({
    'schedule/post-transaction': post,
    'exchange-rates/provider-status': async () => ({
      status: 'ok',
      context: 'test',
      selected: 'test',
      installed: [],
      last: null,
    }),
    'exchange-rates/ensure': ensure,
  });
  const store = createTestAppStore();
  await postScheduleTransaction(store.dispatch, 'yen');
  expect(post).toHaveBeenCalledTimes(2);
  expect(ensure).toHaveBeenCalledWith({
    quoteCurrency: 'JPY',
    date: draft.date,
    forEntry: true,
  });
  expect(store.getState().modals.modalStack).toEqual([]);
});
it('keeps the manual fallback when a connected provider cannot supply a rate', async () => {
  const post = vi.fn(async () => ({
    type: 'rate-unavailable' as const,
    transaction: draft,
    currency: 'JPY',
    precision: 0,
  }));
  initServer({
    'schedule/post-transaction': post,
    'exchange-rates/provider-status': async () => ({
      status: 'ok',
      context: 'test',
      selected: 'test',
      installed: [],
      last: null,
    }),
    'exchange-rates/ensure': async () => ({
      status: 'failed',
      code: 'network',
      context: 'test',
      resolution: { status: 'unavailable' },
    }),
  });
  const store = createTestAppStore();
  await postScheduleTransaction(store.dispatch, 'yen');
  expect(post).toHaveBeenCalledTimes(1);
  expect(store.getState().modals.modalStack[0]?.name).toBe('foreign-amount');
});

it('does not open an old occurrence after its provider context was superseded', async () => {
  initServer({
    'schedule/post-transaction': async () => ({
      type: 'rate-unavailable',
      transaction: draft,
      currency: 'JPY',
      precision: 0,
    }),
    'exchange-rates/provider-status': async () => ({ status: 'superseded' }),
  });
  const store = createTestAppStore();
  await postScheduleTransaction(store.dispatch, 'yen');
  expect(store.getState().modals.modalStack).toEqual([]);
});
