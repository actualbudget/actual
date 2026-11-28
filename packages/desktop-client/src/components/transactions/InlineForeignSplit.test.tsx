import { initServer } from '@actual-app/core/platform/client/connection';
import type {
  AccountEntity,
  TransactionEntity,
} from '@actual-app/core/types/models';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { createTestAppStore, TestProviders } from '#mocks';
import { mergeSyncedPrefs } from '#prefs/prefsSlice';

import { InlineForeignSplit } from './InlineForeignSplit';

vi.mock(
  '@actual-app/core/platform/client/connection',
  () => import('#mocks/connection'),
);
const account = {
  id: 'jpy',
  currency: 'JPY',
  currency_precision: 0,
} as AccountEntity;
const parent: TransactionEntity = {
  id: 't',
  account: 'jpy',
  date: '2026-03-10',
  amount: -1500,
  transaction_amount: -1500,
  _baseAmount: -1000,
};

function setup(total: number, amounts: number[], stale = false) {
  const save = vi.fn(async (_request: object) =>
    stale ? { status: 'stale' as const } : { status: 'ok' as const, ids: [] },
  );
  initServer({
    'budget/edit-effects': async () => [],
    'exchange-rates/resolve': async () => ({ status: 'unavailable' }),
    'transactions/save-foreign-split': save,
  });
  const store = createTestAppStore();
  store.dispatch(
    mergeSyncedPrefs({
      defaultCurrencyCode: 'USD',
      amountEncoding: '{"version":1,"currencyCode":"USD","precision":2}',
    }),
  );
  render(
    <TestProviders store={store}>
      <InlineForeignSplit
        account={account}
        draft={{
          id: 't',
          original: [parent],
          rows: [
            { ...parent, is_parent: true, amount: total },
            ...amounts.map((amount, index) => ({
              ...parent,
              id: `child-${index}`,
              amount,
              _baseAmount: 0,
              is_child: true,
              parent_id: 't',
            })),
          ],
        }}
        onCancel={vi.fn()}
        onSaved={vi.fn()}
        onBusyChange={vi.fn()}
      />
    </TestProviders>,
  );
  return save;
}

it('requires conversion for a changed total and sends the foreign-first rate with its reviewed base', async () => {
  const save = setup(-1800, [-1000, -800]);
  expect(screen.getByRole('button', { name: 'Save splits' })).toBeDisabled();
  await userEvent.type(
    screen.getByRole('textbox', { name: 'Rate in USD per 1 JPY' }),
    '0.008',
  );
  expect(screen.getByLabelText('Base amount')).toHaveAttribute(
    'placeholder',
    '-14.40',
  );
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Save splits' })).toBeEnabled(),
  );
  await userEvent.click(screen.getByRole('button', { name: 'Save splits' }));
  expect(save).toHaveBeenCalledWith(
    expect.objectContaining({
      transaction_amount: -1800,
      rate: '125',
      expectedBaseAmount: -1440,
    }),
  );
});

it('requires a rate for a net-zero family and prevents saving a stale snapshot', async () => {
  const save = setup(0, [-1000, 1000], true);
  expect(screen.queryByRole('textbox', { name: 'Base amount' })).toBeNull();
  expect(screen.getByRole('button', { name: 'Save splits' })).toBeDisabled();
  await userEvent.type(
    screen.getByRole('textbox', { name: 'Rate in USD per 1 JPY' }),
    '0.008',
  );
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Save splits' })).toBeEnabled(),
  );
  await userEvent.click(screen.getByRole('button', { name: 'Save splits' }));
  await screen.findByText(/This transaction changed since you opened it/);
  expect(save).toHaveBeenCalledWith(
    expect.objectContaining({
      transaction_amount: 0,
      rate: '125',
      baseAmount: 0,
    }),
  );
  expect(screen.getByRole('button', { name: 'Save splits' })).toBeDisabled();
});
