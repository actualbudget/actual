import { GridList } from 'react-aria-components';
import { MemoryRouter } from 'react-router';

import { initServer } from '@actual-app/core/platform/client/connection';
import * as monthUtils from '@actual-app/core/shared/months';
import type { CategoryEntity } from '@actual-app/core/types/models';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { SheetNameProvider } from '#hooks/useSheetName';
import {
  configureTestAppStore,
  createTestQueryClient,
  TestProviders,
} from '#mocks';

import { ExpenseCategoryListItem } from './ExpenseCategoryListItem';

vi.mock(
  '@actual-app/core/platform/client/connection',
  () => import('#mocks/connection'),
);
vi.mock('@actual-app/components/hooks/useResponsive', () => ({
  useResponsive: () => ({ isNarrowWidth: true }),
}));
// Cell values by name; every other cell is empty
let mockSheetValues: Record<string, number> = {};
vi.mock('#hooks/useSheetValue', () => ({
  useSheetValue: (binding: string | { name: string }) =>
    mockSheetValues[typeof binding === 'string' ? binding : binding.name] ??
    null,
}));
vi.mock('#hooks/useSyncedPref', () => ({
  useSyncedPref: (name: string) => [
    {
      'flags.currency': 'true',
      'flags.multiCurrency': 'true',
      defaultCurrencyCode: 'CAD',
    }[name],
    vi.fn(),
  ],
}));
// The budget and spent cells need schedule and spreadsheet providers that
// are unrelated to the rows of a category
vi.mock('./BudgetCell', () => ({ BudgetCell: () => null }));
vi.mock('./SpentCell', () => ({ SpentCell: () => null }));

const category: CategoryEntity = {
  id: 'groceries',
  name: 'Groceries',
  group: 'usual',
  is_income: false,
};

// The USD line starts in `startMonth`, or covers every month with null
function renderItem(month = '2024-01', startMonth: string | null = '2024-01') {
  const client = createTestQueryClient();
  const store = configureTestAppStore({ queryClient: client });
  initServer({
    'get-categories': async () => ({ grouped: [], list: [category] }),
    'category-currencies-get': async () => [
      {
        id: 'groceries-USD',
        category: 'groceries',
        currency: 'USD',
        start_month: startMonth,
      },
    ],
    'exchange-rates-get': async () => [],
    query: async () => ({ data: [], dependencies: [] }),
  });
  render(
    <TestProviders queryClient={client} store={store}>
      <MemoryRouter>
        <SheetNameProvider name="budget202401">
          <GridList aria-label="Categories" items={[category]}>
            {item => (
              <ExpenseCategoryListItem
                value={item}
                month={month}
                isHidden={false}
                show3Columns
                showBudgetedColumn
                onEditCategory={vi.fn()}
                onBudgetAction={vi.fn()}
              />
            )}
          </GridList>
        </SheetNameProvider>
      </MemoryRouter>
    </TestProviders>,
  );
  return { store };
}

describe('ExpenseCategoryListItem with currency lines', () => {
  beforeEach(() => {
    // USD was spent in January 2024
    mockSheetValues = { 'sum-amount-groceries-USD': -5000 };
  });

  it('shows the total, then a row for each currency', async () => {
    renderItem();

    const lines = await screen.findAllByTestId('category-currency-line');
    expect(lines.map(line => line.textContent)).toEqual(['CAD', 'USD']);
    // The total is only shown; each currency has its own balance menu
    expect(
      screen.queryByRole('button', {
        name: 'Open balance menu for Groceries category',
      }),
    ).toBeNull();
    for (const currency of ['CAD', 'USD']) {
      expect(
        screen.getByRole('button', {
          name: `Open balance menu for Groceries (${currency}) category`,
        }),
      ).toBeInTheDocument();
    }
  });

  it('opens the balance menu of a currency row on that row', async () => {
    const { store } = renderItem();

    await userEvent.click(
      await screen.findByRole('button', {
        name: 'Open balance menu for Groceries (USD) category',
      }),
    );

    const [modal] = store.getState().modals.modalStack;
    if (modal?.name !== 'envelope-balance-menu') {
      throw new Error(`Expected the envelope balance menu, got ${modal?.name}`);
    }
    expect(modal.options.categoryId).toBe('groceries-USD');
  });

  it('shows a category without its rows in a month nothing happened in', async () => {
    mockSheetValues = {};
    // A line for every month shows from the current month on, which is
    // 2017-01 in tests
    renderItem('2016-12', null);

    await screen.findByRole('button', {
      name: 'Open balance menu for Groceries category',
    });
    // Let the lines load
    await new Promise(resolve => setTimeout(resolve, 50));
    expect(screen.queryAllByTestId('category-currency-line')).toEqual([]);
  });

  it('shows a row budgeted from an earlier month from that month on', async () => {
    mockSheetValues = {};
    renderItem('2016-10', '2016-10');

    const lines = await screen.findAllByTestId('category-currency-line');
    expect(lines.map(line => line.textContent)).toEqual(['CAD', 'USD']);
  });

  it('shows a row added by hand from the current month on, to budget it', async () => {
    mockSheetValues = {};
    renderItem(monthUtils.currentMonth(), null);

    const lines = await screen.findAllByTestId('category-currency-line');
    expect(lines.map(line => line.textContent)).toEqual(['CAD', 'USD']);
  });
});
