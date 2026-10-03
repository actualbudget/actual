import { initServer } from '@actual-app/core/platform/client/connection';

import { createTestAppStore } from '#mocks';

import { postForeignEntry } from './post-foreign-entry';

vi.mock(
  '@actual-app/core/platform/client/connection',
  () => import('#mocks/connection'),
);

const transaction = {
  id: 'draft',
  account: 'gbp',
  date: '2026-11-03',
  transaction_amount: -18150,
};

it.each([-18150, 50000, 0])(
  'posts %s without a dialog when the saved rate completes the pair',
  async amount => {
    const draft = { ...transaction, transaction_amount: amount };
    initServer({
      'transactions/post-foreign-entry': async ({ transaction: posted }) => {
        expect(posted).toEqual(draft);
        return { status: 'ok', id: draft.id };
      },
    });
    const store = createTestAppStore();
    const onPosted = vi.fn();
    await postForeignEntry(store.dispatch, {
      transaction: draft,
      currencyCode: 'GBP',
      nativePrecision: 2,
      onPosted,
    });
    expect(store.getState().modals.modalStack).toEqual([]);
    expect(onPosted).toHaveBeenCalledOnce();
  },
);

it.each([
  { status: 'rate-unavailable' },
  { status: 'rule-date-changed', date: '2026-11-04' },
  { status: 'rule-account-incompatible' },
] as const)(
  'keeps the draft for review when posting returns $status',
  async result => {
    initServer({ 'transactions/post-foreign-entry': async () => result });
    const store = createTestAppStore();
    const onPosted = vi.fn();
    const options = {
      transaction,
      currencyCode: 'GBP',
      nativePrecision: 2,
      onPosted,
    };
    await postForeignEntry(store.dispatch, options);
    expect(store.getState().modals.modalStack).toEqual([
      expect.objectContaining({ name: 'foreign-amount', options }),
    ]);
    expect(onPosted).not.toHaveBeenCalled();
  },
);

it('propagates posting errors without opening a dialog or retrying the write', async () => {
  initServer({
    'transactions/post-foreign-entry': async () => {
      throw new Error('write failed');
    },
  });
  const store = createTestAppStore();
  const onPosted = vi.fn();
  await expect(
    postForeignEntry(store.dispatch, {
      transaction,
      currencyCode: 'GBP',
      nativePrecision: 2,
      onPosted,
    }),
  ).rejects.toThrow('write failed');
  expect(store.getState().modals.modalStack).toEqual([]);
  expect(onPosted).not.toHaveBeenCalled();
});
