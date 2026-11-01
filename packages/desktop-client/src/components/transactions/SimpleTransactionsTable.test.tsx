import { generateTransaction } from '@actual-app/core/mocks';
import { render, screen } from '@testing-library/react';

import { SelectedProviderWithItems } from '#hooks/useSelected';
import { createTestAppStore, TestProviders } from '#mocks';
import { mergeSyncedPrefs } from '#prefs/prefsSlice';

import { SimpleTransactionsTable } from './SimpleTransactionsTable';

it.each([
  [0, -1234, '-1,234'],
  [2, -1234, '-12.34'],
  [3, -1234, '-1.234'],
] as const)(
  'displays a signed transaction at %idp',
  (precision, amount, expected) => {
    const store = createTestAppStore();
    store.dispatch(
      mergeSyncedPrefs({
        amountEncoding: JSON.stringify({
          version: 1,
          currencyCode: 'KWD',
          precision,
        }),
      }),
    );
    const transactions = generateTransaction({
      account: 'account',
      amount,
      date: '2026-09-01',
    });
    render(
      <TestProviders store={store}>
        <SelectedProviderWithItems
          name="transactions"
          items={transactions}
          fetchAllIds={async () =>
            transactions.map(transaction => transaction.id)
          }
        >
          <SimpleTransactionsTable
            transactions={transactions}
            renderEmpty={null}
            fields={['amount']}
          />
        </SelectedProviderWithItems>
      </TestProviders>,
    );
    expect(screen.getByText(expected)).toBeInTheDocument();
  },
);

it('shows the selected symbol with the recorded scale', () => {
  const store = createTestAppStore();
  store.dispatch(
    mergeSyncedPrefs({
      defaultCurrencyCode: 'USD',
      amountEncoding: JSON.stringify({
        version: 1,
        currencyCode: 'USD',
        precision: 2,
      }),
    }),
  );
  const transactions = generateTransaction({
    account: 'account',
    amount: 1234,
    date: '2026-09-01',
  });
  render(
    <TestProviders store={store}>
      <SelectedProviderWithItems
        name="transactions"
        items={transactions}
        fetchAllIds={async () =>
          transactions.map(transaction => transaction.id)
        }
      >
        <SimpleTransactionsTable
          transactions={transactions}
          renderEmpty={null}
          fields={['amount']}
        />
      </SelectedProviderWithItems>
    </TestProviders>,
  );
  expect(screen.getByText(/\$.*12\.34/)).toBeInTheDocument();
});
