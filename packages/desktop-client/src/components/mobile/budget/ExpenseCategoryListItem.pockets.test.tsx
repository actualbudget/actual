import { GridList } from 'react-aria-components';
import { MemoryRouter } from 'react-router';

import { initServer } from '@actual-app/core/platform/client/connection';
import type { CategoryPocketsMonth } from '@actual-app/core/server/budget/pocket-readers';
import type { CategoryEntity } from '@actual-app/core/types/models';
import { render, screen, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

import { SchedulesProvider } from '#hooks/useCachedSchedules';
import { SheetNameProvider } from '#hooks/useSheetName';
import {
  createTestAppStore,
  createTestQueryClient,
  TestProviders,
} from '#mocks';
import { pocketMonthCells } from '#mocks/categoryPockets';
import { an2Months } from '#mocks/fxReservations';
import { fxValuationFixture } from '#mocks/fxValuation';
import { mergeLocalPrefs, mergeSyncedPrefs } from '#prefs/prefsSlice';

import { ExpenseCategoryListItem } from './ExpenseCategoryListItem';

vi.mock(
  '@actual-app/core/platform/client/connection',
  () => import('#mocks/connection'),
);
const cells: Record<string, number | boolean> = {};
vi.mock('#hooks/useSpreadsheet', () => ({
  useSpreadsheet: () => ({
    bind: (
      sheet: string,
      binding: string | { name: string },
      cb: (node: { name: string; value: number | boolean }) => void,
    ) => {
      const name = typeof binding === 'string' ? binding : binding.name;
      cb({ name: `${sheet}!${name}`, value: cells[name] ?? 0 });
      return () => undefined;
    },
  }),
}));

const plain = (text: string | null) => (text ?? '').replace(/[‪‬]/g, '');

const travel = {
  id: 'travel',
  name: 'Travel',
  group: 'group',
  is_income: false,
  hidden: false,
} as CategoryEntity;

function setup(entries: Record<string, CategoryPocketsMonth>) {
  Object.assign(cells, {
    'budget-travel': 5000,
    'sum-amount-travel': 0,
    'leftover-travel': 5000,
  });
  initServer({
    'envelope-budget-month': async ({ month }: { month: string }) =>
      pocketMonthCells(month, entries),
    'budget/fx-valuation': async () => ({
      ...fxValuationFixture,
      reservations: null,
    }),
    query: async () => ({ data: [], dependencies: [] }),
  });
  const store = createTestAppStore();
  store.dispatch(mergeLocalPrefs({ id: 'budget-a' }));
  store.dispatch(
    mergeSyncedPrefs({
      'flags.currency': 'true',
      'flags.multicurrency': 'true',
      budgetType: 'envelope',
      defaultCurrencyCode: 'USD',
      amountEncoding: '{"version":1,"currencyCode":"USD","precision":2}',
    }),
  );
  render(
    <TestProviders store={store} queryClient={createTestQueryClient()}>
      <MemoryRouter>
        <SchedulesProvider>
          <SheetNameProvider name="budget202601">
            <GridList aria-label="Categories" items={[travel]}>
              {category => (
                <ExpenseCategoryListItem
                  key={category.id}
                  value={category}
                  month="2026-01"
                  isHidden={false}
                  show3Columns
                  showBudgetedColumn
                  onEditCategory={vi.fn()}
                  onBudgetAction={vi.fn()}
                />
              )}
            </GridList>
          </SheetNameProvider>
        </SchedulesProvider>
      </MemoryRouter>
    </TestProviders>,
  );
  return store;
}

// MC-10.4 mobile: noneditable parent totals, the base slot and native slots.
it('AN2 shows parent totals, the editable base slot and the JPY slot', async () => {
  const store = setup({ travel: an2Months['2026-01'] });
  const totals = await screen.findByRole('group', {
    name: 'Category totals in the budget currency',
  });
  expect(plain(totals.textContent)).toContain('$50.00');
  expect(plain(totals.textContent)).toContain('-$30.00');
  expect(plain(totals.textContent)).toContain('$20.00');
  expect(within(totals).queryByRole('button')).toBeNull();
  // Only the base slot edits the category's budget-currency lane.
  expect(
    screen.getAllByRole('button', {
      name: 'Open budget menu for Travel category',
    }),
  ).toHaveLength(1);
  expect(screen.getByText('USD')).toBeVisible();
  const jpy = screen.getByRole('button', {
    name: 'Details and actions for Travel JPY, January 2026',
  });
  expect(plain(jpy.textContent)).toContain('3,000');
  await userEvent.click(jpy);
  expect(store.getState().modals.modalStack).toEqual([
    expect.objectContaining({
      name: 'category-pocket',
      options: {
        categoryId: 'travel',
        pocketId: 'travelJpy',
        month: '2026-01',
      },
    }),
  ]);
});

it('keeps an ordinary category editable as before', async () => {
  setup({});
  await new Promise(r => setTimeout(r, 20));
  expect(
    screen.queryByRole('group', {
      name: 'Category totals in the budget currency',
    }),
  ).toBeNull();
  expect(
    screen.getAllByRole('button', {
      name: 'Open budget menu for Travel category',
    }),
  ).toHaveLength(1);
  expect(screen.queryByText('USD')).toBeNull();
});

// MC-10.4 inspection 1, F1 mobile: the base slot row follows its visibility.
const zeroBase = {
  ...an2Months['2026-01'],
  budgeted: 0,
  spent: -3000,
  balance: -3000,
  base: {
    budgeted: 0,
    spent: 0,
    balance: 0,
    carryover: false,
    carryIn: 0,
    reset: 0,
  },
};

it('F1 hides an empty base slot that is not shown', async () => {
  setup({ travel: { ...zeroBase, baseSlot: { id: 'travel', shown: false } } });
  expect(
    await screen.findByRole('group', {
      name: 'Category totals in the budget currency',
    }),
  ).toBeVisible();
  expect(screen.queryByText('USD')).toBeNull();
  expect(
    screen.queryByRole('button', {
      name: 'Open budget menu for Travel category',
    }),
  ).toBeNull();
  expect(
    screen.getByRole('button', {
      name: 'Details and actions for Travel JPY, January 2026',
    }),
  ).toBeVisible();
});

it.each([
  ['explicitly shown while empty', zeroBase],
  ['shown through activity', an2Months['2026-01']],
])('F1 shows the base slot when %s', async (_, entry) => {
  setup({ travel: { ...entry, baseSlot: { id: 'travel', shown: true } } });
  expect(await screen.findByText('USD')).toBeVisible();
  expect(
    screen.getAllByRole('button', {
      name: 'Open budget menu for Travel category',
    }),
  ).toHaveLength(1);
});
