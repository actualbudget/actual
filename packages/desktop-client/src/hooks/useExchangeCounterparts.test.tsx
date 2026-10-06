import type { ReactNode } from 'react';

import type {
  AccountEntity,
  TransactionEntity,
} from '@actual-app/core/types/models';
import { render, screen, waitFor } from '@testing-library/react';

import { createTestAppStore, TestProviders } from '#mocks';
import { mergeSyncedPrefs } from '#prefs/prefsSlice';

import {
  ExchangeCounterpartLabel,
  ExchangeCounterpartsProvider,
  useExchangeCounterparts,
} from './useExchangeCounterparts';

const rows = vi.hoisted(() => ({
  value: [] as Array<Record<string, unknown>>,
}));
vi.mock('#hooks/useTransactions', async () => {
  const { useState } = await import('react');
  return {
    // Pages like the real hook: pageSize rows per page.
    useTransactions: ({
      query,
      options,
    }: {
      query: {
        serialize: () => { filterExpressions: Array<Record<string, unknown>> };
      };
      options: { pageSize: number };
    }) => {
      const [pages, setPages] = useState(1);
      const [filter] = query.serialize().filterExpressions;
      let matches;
      if ('parent_id' in filter) {
        const parents = (filter.parent_id as { $oneof: string[] }).$oneof;
        matches = rows.value.filter(
          r => parents.includes(r.parent_id as string) && r.transfer_id,
        );
      } else {
        const ids = (filter.id as { $oneof: string[] }).$oneof;
        matches = rows.value.filter(r => ids.includes(r.id as string));
      }
      const shown = pages * options.pageSize;
      return {
        transactions: matches.slice(0, shown),
        hasNextPage: matches.length > shown,
        isFetchingNextPage: false,
        fetchNextPage: async () => setPages(p => p + 1),
      };
    },
  };
});

function account(
  id: string,
  currency: string | null,
  precision: number | null,
) {
  return {
    id,
    name: id,
    currency,
    currency_precision: precision,
    offbudget: 0,
  } as AccountEntity;
}

const accounts = [account('usd', null, null), account('jpy', 'JPY', 0)];

function Labels({
  transactions,
  children,
}: {
  transactions: TransactionEntity[];
  children: ReactNode;
}) {
  const counterparts = useExchangeCounterparts(transactions, accounts);
  return (
    <ExchangeCounterpartsProvider value={counterparts}>
      {children}
    </ExchangeCounterpartsProvider>
  );
}

function renderLabels(transactions: TransactionEntity[], ids: string[]) {
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
  render(
    <TestProviders store={store}>
      <Labels transactions={transactions}>
        {ids.map(id => (
          <div key={id} data-testid={`row-${id}`}>
            <ExchangeCounterpartLabel transactionId={id} />
          </div>
        ))}
      </Labels>
    </TestProviders>,
  );
}

it('shows the other leg in its currency, also for fee parents', async () => {
  rows.value = [
    // A standalone dollar leg and its yen counterpart.
    { id: 'usd-leg', account: 'usd', amount: -10000, transfer_id: 'jpy-leg' },
    {
      id: 'jpy-leg',
      account: 'jpy',
      amount: 10000,
      transaction_amount: 15000,
      transfer_id: 'usd-leg',
    },
    // A dollar fee parent whose transfer child links to yen.
    {
      id: 'child',
      parent_id: 'parent',
      account: 'usd',
      amount: -10000,
      transfer_id: 'jpy-leg2',
    },
    {
      id: 'jpy-leg2',
      account: 'jpy',
      amount: 10000,
      transaction_amount: 14000,
      transfer_id: 'child',
    },
  ];
  renderLabels(
    [
      { id: 'usd-leg', account: 'usd', transfer_id: 'jpy-leg' },
      { id: 'parent', account: 'usd', is_parent: true },
      { id: 'plain', account: 'usd' },
    ] as TransactionEntity[],
    ['usd-leg', 'parent', 'plain'],
  );
  await waitFor(() =>
    expect(screen.getByTestId('row-usd-leg').textContent).toMatch(/15,000/),
  );
  expect(screen.getByTestId('row-parent').textContent).toMatch(/14,000/);
  expect(screen.getByTestId('row-plain').textContent).toBe('');
});

it('shows nothing once the other leg is unlinked', () => {
  rows.value = [
    { id: 'usd-leg', account: 'usd', amount: -10000, transfer_id: 'jpy-leg' },
    {
      id: 'jpy-leg',
      account: 'jpy',
      amount: 10000,
      transaction_amount: 15000,
      transfer_id: null,
    },
  ];
  renderLabels(
    [
      { id: 'usd-leg', account: 'usd', transfer_id: 'jpy-leg' },
    ] as TransactionEntity[],
    ['usd-leg'],
  );
  expect(screen.getByTestId('row-usd-leg').textContent).toBe('');
});

it('finds the fee parent child behind an ordinary split with many transfers', async () => {
  rows.value = [
    ...[1, 2, 3, 4].map(n => ({
      id: `ordinary-${n}`,
      parent_id: 'ordinary',
      account: 'usd',
      amount: -100,
      transfer_id: `elsewhere-${n}`,
    })),
    {
      id: 'child',
      parent_id: 'parent',
      account: 'usd',
      amount: -10000,
      transfer_id: 'jpy-leg',
    },
    {
      id: 'jpy-leg',
      account: 'jpy',
      amount: 10000,
      transaction_amount: 14000,
      transfer_id: 'child',
    },
  ];
  renderLabels(
    [
      { id: 'ordinary', account: 'usd', is_parent: true },
      { id: 'parent', account: 'usd', is_parent: true },
    ] as TransactionEntity[],
    ['parent'],
  );
  await waitFor(() =>
    expect(screen.getByTestId('row-parent').textContent).toMatch(/14,000/),
  );
});
