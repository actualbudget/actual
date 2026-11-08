import type { ReactElement } from 'react';
import { MemoryRouter } from 'react-router';

import { generateAccount } from '@actual-app/core/mocks';
import { initServer } from '@actual-app/core/platform/client/connection';
import type {
  AccountEntity,
  TransactionEntity,
} from '@actual-app/core/types/models';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { SelectedTransactionsFloatingActionBar } from '#components/mobile/transactions/TransactionList';
import { CategoryAutocompleteModal } from '#components/modals/CategoryAutocompleteModal';
import { SelectedProviderWithItems } from '#hooks/useSelected';
import {
  configureTestAppStore,
  createTestQueryClient,
  TestProviders,
} from '#mocks';
import { mergeLocalPrefs, mergeSyncedPrefs } from '#prefs/prefsSlice';

import { SelectedTransactionsButton } from './SelectedTransactionsButton';

vi.mock(
  '@actual-app/core/platform/client/connection',
  () => import('#mocks/connection'),
);

// MC-10.6 fix round 1 (F5): Route to pockets for selected transactions, on
// desktop and mobile, by their shown category or a chosen one (B4).

const yen: AccountEntity = {
  ...generateAccount('Yen wallet'),
  currency: 'JPY',
  currency_precision: 0,
};
// The picker's balances are sheet cells; their values are not under test.
vi.mock('#hooks/useSheetValue', () => ({ useSheetValue: () => 0 }));
vi.mock('#hooks/useAccounts', () => ({
  useAccounts: () => ({ data: [yen] }),
}));

const rows: TransactionEntity[] = [
  {
    id: 'late',
    account: yen.id,
    amount: -2000,
    transaction_amount: -200000,
    date: '2026-01-15',
    category: 'food',
  },
];
const noop = vi.fn();

let store: ReturnType<typeof configureTestAppStore>;
let route: ReturnType<
  typeof vi.fn<
    (arg: { ids: string[]; category?: string }) => Promise<{ routed: string[] }>
  >
>;

function setup(children: ReactElement, available = true, rejects = false) {
  route = vi.fn(async () => {
    if (rejects) throw new Error('pocket-category-income');
    return { routed: ['late'] };
  });
  initServer({
    'budget/route-to-pockets': route,
    'get-categories': async () => ({
      grouped: [
        {
          id: 'expenses',
          name: 'Expenses',
          is_income: false,
          categories: [
            { id: 'travel', name: 'Travel', group: 'expenses' },
            { id: 'food', name: 'Food', group: 'expenses' },
          ],
        },
        {
          id: 'income',
          name: 'Income',
          is_income: true,
          categories: [
            {
              id: 'salary',
              name: 'Salary',
              group: 'income',
              is_income: true,
            },
          ],
        },
      ],
      list: [
        { id: 'travel', name: 'Travel', group: 'expenses' },
        { id: 'food', name: 'Food', group: 'expenses' },
        { id: 'salary', name: 'Salary', group: 'income', is_income: true },
      ],
    }),
  });
  store = configureTestAppStore({ queryClient: createTestQueryClient() });
  store.dispatch(mergeLocalPrefs({ id: 'budget-a' }));
  store.dispatch(
    mergeSyncedPrefs({
      'flags.currency': 'true',
      'flags.multicurrency': available ? 'true' : 'false',
      budgetType: 'envelope',
      defaultCurrencyCode: 'USD',
      amountEncoding: '{"version":1,"currencyCode":"USD","precision":2}',
    }),
  );
  render(
    <TestProviders store={store}>
      <MemoryRouter>
        <SelectedProviderWithItems
          name="transactions"
          items={rows}
          initialSelectedIds={['late']}
          fetchAllIds={() => Promise.resolve(['late'])}
        >
          {children}
        </SelectedProviderWithItems>
      </MemoryRouter>
    </TestProviders>,
  );
}

const desktop = (
  <SelectedTransactionsButton
    getTransaction={id => rows.find(r => r.id === id)}
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
);

const mobile = (
  <SelectedTransactionsFloatingActionBar
    transactions={rows}
    showMakeTransfer={false}
  />
);

const chooser = () =>
  store
    .getState()
    .modals.modalStack.find(modal => modal.name === 'category-autocomplete');

async function openDesktop() {
  await userEvent.click(screen.getByTestId('transactions-select-button'));
}
async function openMobile() {
  await userEvent.click(screen.getByRole('button', { name: 'More options' }));
}

describe.each([
  ['desktop', desktop, openDesktop],
  ['mobile', mobile, openMobile],
] as const)('%s', (_layout, element, open) => {
  it('routes the selected rows from their shown category', async () => {
    setup(element);
    await open();
    await userEvent.click(await screen.findByText('Route to currency pockets'));
    expect(route).toHaveBeenCalledWith({ ids: ['late'] });
  });

  it('routes the selected rows from a chosen category (B4)', async () => {
    setup(element);
    await open();
    await userEvent.click(
      await screen.findByText('Route to currency pockets in category…'),
    );
    const modal = chooser();
    expect(modal).toBeDefined();
    if (modal?.name !== 'category-autocomplete') return;
    modal.options.onSelect('travel', 'Travel');
    await waitFor(() =>
      expect(route).toHaveBeenCalledWith({ ids: ['late'], category: 'travel' }),
    );
  });

  it('offers only expense categories in the real picker (N1)', async () => {
    setup(element);
    await open();
    await userEvent.click(
      await screen.findByText('Route to currency pockets in category…'),
    );
    const modal = chooser();
    if (modal?.name !== 'category-autocomplete') throw new Error('no picker');
    cleanup();
    render(
      <TestProviders store={store}>
        <CategoryAutocompleteModal {...modal.options} />
      </TestProviders>,
    );
    expect(await screen.findByText('Travel')).toBeVisible();
    expect(screen.queryByText('Salary')).toBeNull();
    expect(screen.queryByText('Income')).toBeNull();
    await userEvent.click(screen.getByText('Travel'));
    await waitFor(() =>
      expect(route).toHaveBeenCalledWith({ ids: ['late'], category: 'travel' }),
    );
  });

  it('tells the user when routing is rejected (N1)', async () => {
    setup(element, true, true);
    await open();
    await userEvent.click(await screen.findByText('Route to currency pockets'));
    await waitFor(() =>
      expect(store.getState().notifications.notifications).toEqual([
        expect.objectContaining({
          type: 'error',
          message:
            'These transactions could not be routed to currency pockets.',
        }),
      ]),
    );
  });

  it('is absent without multicurrency', async () => {
    setup(element, false);
    await open();
    await screen.findByText('Delete');
    expect(screen.queryByText('Route to currency pockets')).toBeNull();
  });
});
