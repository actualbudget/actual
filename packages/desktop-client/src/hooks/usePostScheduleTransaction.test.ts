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
