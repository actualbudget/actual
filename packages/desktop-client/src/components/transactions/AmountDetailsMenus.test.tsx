import { useRef } from 'react';
import type { ReactElement } from 'react';

import { generateAccount } from '@actual-app/core/mocks';
import type {
  AccountEntity,
  TransactionEntity,
} from '@actual-app/core/types/models';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { SelectedProviderWithItems } from '#hooks/useSelected';
import {
  configureTestAppStore,
  createTestQueryClient,
  TestProviders,
} from '#mocks';
import { aqlQuery } from '#queries/aqlQuery';

import { SelectedTransactionsButton } from './SelectedTransactionsButton';
import { useTransactionRowContextActions } from './useTransactionRowContextActions';

vi.mock(
  '@actual-app/core/platform/client/connection',
  () => import('#mocks/connection'),
);

vi.mock('#queries/aqlQuery', () => ({ aqlQuery: vi.fn() }));
vi.mock('#hooks/usePayees', () => ({ usePayees: () => ({ data: [] }) }));

const usd: AccountEntity = generateAccount('Checking');
const yen: AccountEntity = {
  ...generateAccount('Yen wallet'),
  currency: 'JPY',
  currency_precision: 0,
};
vi.mock('#hooks/useAccounts', () => ({
  useAccounts: () => ({ data: [usd, yen] }),
}));

const row = (
  id: string,
  fields: Partial<TransactionEntity> = {},
): TransactionEntity => ({
  id,
  account: yen.id,
  amount: -1000,
  transaction_amount: -1500,
  date: '2026-03-10',
  ...fields,
});

const rows = [
  row('single'),
  row('parent', { is_parent: true }),
  row('child', { is_child: true, parent_id: 'parent' }),
  row('leg', { transfer_id: 'other-leg' }),
  row('base', { account: usd.id, transaction_amount: null }),
];
const getTransaction = (id: string) => rows.find(r => r.id === id);
const noop = vi.fn();

let store: ReturnType<typeof configureTestAppStore>;
beforeEach(() => {
  vi.mocked(aqlQuery).mockImplementation(async query => {
    const id = query
      .serialize()
      .filterExpressions.find(filter => typeof filter.id === 'string')?.id;
    return {
      data: typeof id === 'string' ? [getTransaction(id) ?? row(id)] : [],
      dependencies: [],
    };
  });
  store = configureTestAppStore({ queryClient: createTestQueryClient() });
});

function Providers({
  selected,
  children,
}: {
  selected: string[];
  children: ReactElement;
}) {
  return (
    <TestProviders store={store}>
      <SelectedProviderWithItems
        name="transactions"
        items={rows}
        initialSelectedIds={selected}
        fetchAllIds={() => Promise.resolve(rows.map(r => r.id))}
      >
        {children}
      </SelectedProviderWithItems>
    </TestProviders>
  );
}

const openedDetails = () =>
  store
    .getState()
    .modals.modalStack.filter(modal =>
      ['foreign-amount', 'foreign-split', 'exchange-transfer'].includes(
        modal.name,
      ),
    );

describe('Amount details in the Selected button menu', () => {
  function renderButton(selected: string[]) {
    render(
      <Providers selected={selected}>
        <SelectedTransactionsButton
          getTransaction={getTransaction}
          onShow={noop}
          onDuplicate={noop}
          onDelete={noop}
          onEdit={noop}
          onLinkSchedule={noop}
          onUnlinkSchedule={noop}
          onCreateRule={noop}
          onRunRules={noop}
          onSetTransfer={noop}
          onScheduleAction={noop}
          showMakeTransfer={false}
          onMakeAsSplitTransaction={noop}
          onMakeAsNonSplitTransactions={noop}
          onMergeTransactions={noop}
        />
      </Providers>,
    );
  }

  it.each(['single', 'parent', 'child', 'leg'])(
    'opens the details of one selected foreign row (%s)',
    async id => {
      renderButton([id]);
      await userEvent.click(screen.getByTestId('transactions-select-button'));
      await userEvent.click(await screen.findByText('Amount details'));
      await waitFor(() => expect(openedDetails()).toHaveLength(1));
      expect(store.getState().modals.modalStack.at(-1)?.name).toBe(
        id === 'parent' || id === 'child' ? 'foreign-split' : 'foreign-amount',
      );
    },
  );

  it.each([[['base']], [['single', 'leg']]])(
    'is absent for %j',
    async selected => {
      renderButton(selected);
      await userEvent.click(screen.getByTestId('transactions-select-button'));
      await screen.findByText('Delete');
      expect(screen.queryByText('Amount details')).not.toBeInTheDocument();
    },
  );
});

describe('Amount details in the row context menu', () => {
  function Row({ id }: { id: string }) {
    const rowRef = useRef<HTMLDivElement>(null);
    useTransactionRowContextActions({
      rowRef,
      transaction: getTransaction(id)!,
      getTransaction,
      onDuplicate: noop,
      onDelete: noop,
      onLinkSchedule: noop,
      onUnlinkSchedule: noop,
      onCreateRule: noop,
      onScheduleAction: noop,
      onMakeAsNonSplitTransactions: noop,
    });
    return <div ref={rowRef}>{id}</div>;
  }

  function openMenu(id: string, selected: string[] = []) {
    render(
      <Providers selected={selected}>
        <Row id={id} />
      </Providers>,
    );
    fireEvent.contextMenu(screen.getByText(id));
    return store.getState().contextMenu.items;
  }

  it.each(['single', 'parent', 'child', 'leg'])(
    'opens the details of the row (%s)',
    async id => {
      const item = openMenu(id).find(
        i => typeof i === 'object' && i.name === 'amount-details',
      );
      expect(item).toBeDefined();
      if (typeof item === 'object') item.onClick?.();
      await waitFor(() => expect(openedDetails()).toHaveLength(1));
      expect(store.getState().modals.modalStack.at(-1)?.name).toBe(
        id === 'parent' || id === 'child' ? 'foreign-split' : 'foreign-amount',
      );
    },
  );

  it.each([
    ['base', []],
    ['single', ['single', 'leg']],
  ])('is absent for %s with selection %j', (id, selected) => {
    const names = openMenu(id, selected).map(i =>
      typeof i === 'object' ? i.name : null,
    );
    expect(names).toContain('delete');
    expect(names).not.toContain('amount-details');
  });
});
