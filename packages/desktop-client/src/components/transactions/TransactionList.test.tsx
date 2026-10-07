import { useRef, useState } from 'react';
import { MemoryRouter } from 'react-router';

import {
  generateAccount,
  generateCategoryGroups,
} from '@actual-app/core/mocks';
import { initServer } from '@actual-app/core/platform/client/connection';
import type { TransactionEntity } from '@actual-app/core/types/models';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { AuthProvider } from '#auth/AuthProvider';
import type { TableHandleRef } from '#components/table';
import { CurrencyFormatProvider } from '#hooks/currencyFormatContext';
import { SchedulesProvider } from '#hooks/useCachedSchedules';
import { SelectedProviderWithItems } from '#hooks/useSelected';
import { SplitsExpandedProvider } from '#hooks/useSplitsExpanded';
import { SpreadsheetProvider } from '#hooks/useSpreadsheet';
import {
  createTestAppStore,
  createTestQueryClient,
  TestProviders,
} from '#mocks';
import { payeeQueries } from '#payees';
import { mergeSyncedPrefs } from '#prefs/prefsSlice';
import { tagQueries } from '#tags/queries';

import { TransactionList } from './TransactionList';

vi.mock(
  '@actual-app/core/platform/client/connection',
  () => import('#mocks/connection'),
);
const account = {
  ...generateAccount('Yen'),
  currency: 'JPY',
  currency_precision: 0,
};
const groups = generateCategoryGroups([]);
vi.mock('#hooks/useAccounts', () => ({
  useAccounts: () => ({ data: [account] }),
}));
vi.mock('#hooks/useCategories', () => ({
  useCategories: () => ({ data: { list: [], grouped: [] } }),
}));
const original: TransactionEntity = {
  id: 't',
  account: account.id,
  date: '2026-03-10',
  amount: -1500,
  transaction_amount: -1500,
  _baseAmount: -1000,
};

function setup(nativeView = true) {
  const save = vi.fn<
    (
      ...args: [
        request: {
          id: string;
          transaction_amount: number;
          expected: object;
          children: object[];
        },
      ]
    ) => Promise<{ status: 'ok'; ids: string[] }>
  >(async () => ({ status: 'ok', ids: [] }));
  initServer({
    'transactions/save-foreign-split': save,
    'rules-run': async ({ transaction }) => transaction,
    'exchange-rates/resolve': async () => ({ status: 'unavailable' }),
  });
  const store = createTestAppStore();
  store.dispatch(
    mergeSyncedPrefs({
      defaultCurrencyCode: 'USD',
      amountEncoding: '{"version":1,"currencyCode":"USD","precision":2}',
    }),
  );
  const client = createTestQueryClient();
  client.setQueryData(payeeQueries.list().queryKey, []);
  client.setQueryData(tagQueries.list().queryKey, []);
  function Harness() {
    const [rows, setRows] = useState([
      nativeView
        ? original
        : { ...original, amount: -1000, _baseAmount: undefined },
    ]);
    const ref = useRef<TableHandleRef<TransactionEntity>>(null);
    return (
      <SelectedProviderWithItems
        name="transactions"
        items={rows}
        fetchAllIds={async () => rows.map(r => r.id)}
      >
        <SplitsExpandedProvider>
          <CurrencyFormatProvider currencyCode="JPY" precision={0}>
            <TransactionList
              tableRef={ref}
              renderEmpty={() => null}
              sortField="date"
              ascDesc="desc"
              showSelection
              transactions={rows}
              allTransactions={rows}
              account={nativeView ? account : undefined}
              accounts={[account]}
              category={undefined}
              categoryGroups={groups}
              payees={[]}
              balances={{}}
              showBalances={false}
              showCleared
              showReconciled={false}
              showGroup={false}
              showAccount={false}
              isAdding={false}
              isNew={() => false}
              isMatched={() => false}
              dateFormat="MM/dd/yyyy"
              hideFraction={false}
              loadMoreTransactions={vi.fn()}
              onChange={(_, rows) => setRows(rows)}
              onRefetch={vi.fn()}
              onApplyFilter={vi.fn()}
              onCloseAddTransaction={vi.fn()}
              onCreatePayee={async () => ''}
              onSort={vi.fn()}
              onBatchDelete={vi.fn()}
              onBatchDuplicate={vi.fn()}
              onBatchLinkSchedule={vi.fn()}
              onBatchUnlinkSchedule={vi.fn()}
              onCreateRule={vi.fn()}
              onScheduleAction={vi.fn()}
              onMakeAsNonSplitTransactions={vi.fn()}
            />
          </CurrencyFormatProvider>
        </SplitsExpandedProvider>
      </SelectedProviderWithItems>
    );
  }
  const result = render(
    <TestProviders store={store} queryClient={client}>
      <MemoryRouter>
        <AuthProvider>
          <SpreadsheetProvider>
            <SchedulesProvider>
              <Harness />
            </SchedulesProvider>
          </SpreadsheetProvider>
        </AuthProvider>
      </MemoryRouter>
    </TestProviders>,
  );
  return { ...result, save, store };
}

it('edits foreign splits in the existing table and cancels without writing', async () => {
  const { container, save, store } = setup();
  const category = container.querySelector<HTMLElement>(
    '[data-testid="transaction-table"] [data-testid="category"] > div',
  );
  assert(category);
  await userEvent.click(category);
  await userEvent.click(await screen.findByTestId('split-transaction-button'));
  await waitFor(() =>
    expect(
      container.querySelectorAll(
        '[data-testid="transaction-table"] [data-testid="row"]',
      ),
    ).toHaveLength(3),
  );
  const details = screen.getByTestId('transaction-row-details');
  expect(details.closest('[data-focus-key]')).toHaveAttribute(
    'data-focus-key',
    't',
  );
  expect(
    details.previousElementSibling?.querySelector('[data-testid="row"]'),
  ).toBeInTheDocument();
  expect(store.getState().modals.modalStack).toEqual([]);
  expect(save).not.toHaveBeenCalled();
  await userEvent.click(
    screen.getByRole('button', { name: 'Cancel split edits' }),
  );
  await waitFor(() =>
    expect(
      container.querySelectorAll(
        '[data-testid="transaction-table"] [data-testid="row"]',
      ),
    ).toHaveLength(1),
  );
  expect(save).not.toHaveBeenCalled();
});

it('keeps an incomplete inline family local and saves the balanced native family', async () => {
  const { container, save } = setup();
  const category = container.querySelector<HTMLElement>(
    '[data-testid="transaction-table"] [data-testid="category"] > div',
  );
  assert(category);
  await userEvent.click(category);
  await userEvent.click(await screen.findByTestId('split-transaction-button'));
  async function debit(index: number, value: string) {
    await userEvent.keyboard('{Escape}');
    const cell = container.querySelectorAll(
      '[data-testid="transaction-table"] [data-testid="debit"]',
    )[index];
    assert(cell);
    if (!cell.querySelector('input')) {
      const target = cell.querySelector(
        'button, [data-testid="cell-button"], div',
      );
      assert(target);
      await userEvent.click(target);
    }
    let input = cell.querySelector('input');
    assert(input);
    await userEvent.clear(input);
    input = container
      .querySelectorAll(
        '[data-testid="transaction-table"] [data-testid="debit"]',
      )
      [index].querySelector('input');
    assert(input);
    await new Promise(resolve => setTimeout(resolve, 0));
    input.focus();
    expect(document.activeElement).toBe(input);
    await userEvent.type(input, value, { skipClick: true });
    expect(input).toHaveValue(value);
    await userEvent.keyboard('{Tab}');
    await userEvent.tab();
    await userEvent.keyboard('{Escape}');
  }
  expect(screen.getByRole('button', { name: 'Save splits' })).toBeDisabled();
  await debit(1, '1000');
  expect(save).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: 'Save splits' })).toBeDisabled();
  await userEvent.keyboard('{Escape}');
  await userEvent.click(screen.getByTestId('distribute-split-button'));
  expect(
    [
      ...container.querySelectorAll(
        '[data-testid="transaction-table"] [data-testid="debit"]',
      ),
    ].map(e => e.querySelector('input')?.value || e.textContent),
  ).toEqual(['1,500', '1,000', '500']);
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Save splits' })).toBeEnabled(),
  );
  await userEvent.click(screen.getByRole('button', { name: 'Save splits' }));
  await waitFor(() => expect(save).toHaveBeenCalledOnce());
  expect(save.mock.calls[0][0]).toMatchObject({
    id: 't',
    transaction_amount: -1500,
    expected: { t: { amount: -1000, transaction_amount: -1500 } },
    children: [{ transaction_amount: -1000 }, { transaction_amount: -500 }],
  });
  expect(save.mock.calls[0][0]).not.toHaveProperty('baseAmount');
});

it('opens a mixed-account split in native units and restores base units on cancel', async () => {
  const { container, save } = setup(false);
  const category = container.querySelector<HTMLElement>(
    '[data-testid="transaction-table"] [data-testid="category"] > div',
  );
  assert(category);
  await userEvent.click(category);
  await userEvent.click(await screen.findByTestId('split-transaction-button'));
  await waitFor(() =>
    expect(
      container.querySelector(
        '[data-testid="transaction-table"] [data-testid="debit"]',
      ),
    ).toHaveTextContent('1,500'),
  );
  await userEvent.click(
    screen.getByRole('button', { name: 'Cancel split edits' }),
  );
  await waitFor(() =>
    expect(
      container.querySelector(
        '[data-testid="transaction-table"] [data-testid="debit"]',
      ),
    ).toHaveTextContent('1,000'),
  );
  expect(save).not.toHaveBeenCalled();
});
