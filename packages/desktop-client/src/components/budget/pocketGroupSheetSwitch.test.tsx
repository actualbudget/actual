import type { ReactNode } from 'react';

import { initServer } from '@actual-app/core/platform/client/connection';
import type { CategoryPocketsMonth } from '@actual-app/core/server/budget/pocket-readers';
import type { CategoryGroupEntity } from '@actual-app/core/types/models';
import { act, render, screen, waitFor } from '@testing-library/react';

import { CategoryGroupMonth } from '#components/budget/envelope/PocketRows';
import { ExpenseGroupHeader } from '#components/mobile/budget/ExpenseGroupListItem';
import { useCategoryPockets } from '#hooks/useCategoryPockets';
import { useFormat } from '#hooks/useFormat';
import { SheetNameProvider } from '#hooks/useSheetName';
import { useSheetValue } from '#hooks/useSheetValue';
import { SpreadsheetProvider } from '#hooks/useSpreadsheet';
import {
  createTestAppStore,
  createTestQueryClient,
  TestProviders,
} from '#mocks';
import { pocketMonthCells } from '#mocks/categoryPockets';
import { an2Months } from '#mocks/fxReservations';
import { mergeLocalPrefs, mergeSyncedPrefs } from '#prefs/prefsSlice';
import { envelopeBudget } from '#spreadsheet/bindings';

// The real spreadsheet client; only the server connection is mocked. Each
// case compares the group with the rows it renders: Travel's reader parent
// and Food's ordinary cells through useSheetValue, formatted as the budget
// formats them (an unloaded value shows 0.00).
vi.mock(
  '@actual-app/core/platform/client/connection',
  () => import('#mocks/connection'),
);

const bills = {
  id: 'group',
  name: 'Bills',
  categories: [
    { id: 'travel', name: 'Travel', group: 'group' },
    { id: 'food', name: 'Food', group: 'group' },
  ],
} as CategoryGroupEntity;

const travel: Record<string, CategoryPocketsMonth> = {
  // Travel's parent 50.00 / -30.00 / 20.00 in January,
  '2026-01': an2Months['2026-01'],
  // and 70.00 / -30.00 / 40.00 in February.
  '2026-02': {
    ...an2Months['2026-01'],
    budgeted: 7000,
    balance: 4000,
    base: { ...an2Months['2026-01'].base, budgeted: 7000, balance: 7000 },
  },
};

// Food's ordinary cells: January 40.00 / -10.00 / 30.00, February 20.00 /
// -10.00 / 10.00.
const food: Record<string, Record<string, number>> = {
  budget202601: {
    'budget-food': 4000,
    'sum-amount-food': -1000,
    'leftover-food': 3000,
  },
  budget202602: {
    'budget-food': 2000,
    'sum-amount-food': -1000,
    'leftover-food': 1000,
  },
};

/** Minor units of every amount shown in an element, in order. */
function amounts(element: HTMLElement) {
  const text = (element.textContent ?? '').replace(/[‪‬]/g, '');
  return [...text.matchAll(/(-?)\$([\d,]+)\.(\d{2})/g)].map(
    ([, sign, whole, cents]) =>
      (sign ? -1 : 1) * (Number(whole.replace(/,/g, '')) * 100 + Number(cents)),
  );
}

function TravelRow({ month }: { month: string }) {
  const format = useFormat();
  const entry = useCategoryPockets(month).get('travel');
  if (!entry) return null;
  return (
    <div data-testid="travel-row">
      {[entry.budgeted, entry.spent, entry.balance].map((value, i) => (
        <span key={i}>{format(value, 'financial')}</span>
      ))}
    </div>
  );
}

function FoodRow() {
  const format = useFormat();
  const values = [
    useSheetValue<'envelope-budget', 'budget'>(
      envelopeBudget.catBudgeted('food'),
    ),
    useSheetValue<'envelope-budget', 'sum-amount'>(
      envelopeBudget.catSumAmount('food'),
    ),
    useSheetValue<'envelope-budget', 'leftover'>(
      envelopeBudget.catBalance('food'),
    ),
  ];
  return (
    <div data-testid="food-row">
      {values.map((value, i) => (
        <span key={i}>{format(value, 'financial')}</span>
      ))}
    </div>
  );
}

// An earlier observer of January's Food cells, so a later binding shares
// their pending reads (the path R1 guards).
function EarlierObserver() {
  return (
    <SheetNameProvider name="budget202601">
      <FoodRow />
    </SheetNameProvider>
  );
}

function setup(
  group: (month: string) => ReactNode,
  { heldSheet, earlier = false }: { heldSheet: string; earlier?: boolean },
) {
  // Food's reads in the held sheet stay pending until released.
  const held: Array<() => void> = [];
  initServer({
    'envelope-budget-month': async ({ month }: { month: string }) =>
      pocketMonthCells(month, { travel: travel[month] }),
    'get-cell': ({ sheetName, name }: { sheetName: string; name: string }) => {
      const node = {
        name: `${sheetName}!${name}`,
        value: food[sheetName]?.[name] ?? 0,
      };
      if (sheetName !== heldSheet || !name.endsWith('-food')) {
        return Promise.resolve(node);
      }
      return new Promise(resolve => held.push(() => resolve(node)));
    },
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
  const queryClient = createTestQueryClient();
  const ui = (month: string) => (
    <TestProviders store={store} queryClient={queryClient}>
      <SpreadsheetProvider>
        {earlier && <EarlierObserver />}
        <SheetNameProvider name={`budget${month.replace('-', '')}`}>
          <TravelRow month={month} />
          <div data-testid="current-food">
            <FoodRow />
          </div>
          {group(month)}
        </SheetNameProvider>
      </SpreadsheetProvider>
    </TestProviders>
  );
  const { rerender } = render(ui('2026-01'));

  const group_ = () => screen.getByRole('group', { name: 'Bills totals' });
  /** The group's amounts and the sum of the rows on screen. */
  const compare = () => {
    const rows = [
      screen.getByTestId('travel-row'),
      screen.getByTestId('current-food'),
    ].map(amounts);
    return {
      group: amounts(group_()),
      rows: rows[0].map((value, i) => value + rows[1][i]),
    };
  };
  const release = async () => {
    await act(async () => {
      held.forEach(resolve => resolve());
      held.length = 0;
      await new Promise(r => setTimeout(r, 20));
    });
  };
  return {
    held,
    release,
    compare,
    rerender: (month: string) => rerender(ui(month)),
  };
}

/** The group equals the rows on screen, with the expected rows. */
async function expectGroupEqualsRows(
  { compare }: ReturnType<typeof setup>,
  rows: number[],
) {
  await waitFor(() => expect(compare().rows).toEqual(rows));
  const { group, rows: shown } = compare();
  expect(group).toEqual(shown);
}

const layouts = [
  [
    'desktop',
    (month: string) => (
      <CategoryGroupMonth
        MonthComponent={() => <div>Existing group cells</div>}
        month={month}
        group={bills}
      />
    ),
  ],
  [
    'mobile',
    (month: string) => (
      <ExpenseGroupHeader
        categoryGroup={bills}
        month={month}
        show3Columns
        showBudgetedColumn
        onEditCategoryGroup={vi.fn()}
        isCollapsed={() => false}
        onToggleCollapse={vi.fn()}
        isHidden={false}
      />
    ),
  ],
] as const;

// MC-10.4 R2, revised by user direction: the group follows what the rows
// show, as the budget already does for loading amounts.
it.each(layouts)(
  'R2 %s: after a switch the group keeps the rows still shown, then follows them',
  async (_, group) => {
    const view = setup(group, { heldSheet: 'budget202602' });
    // January settled: Travel 50.00 / -30.00 / 20.00, Food 40.00 / -10.00 / 30.00.
    await expectGroupEqualsRows(view, [9000, -4000, 5000]);

    view.rerender('2026-02');
    await waitFor(() => expect(view.held.length).toBe(3));
    // Travel shows February; Food's row still shows January until its reads
    // arrive: 110.00 / -40.00 / 70.00.
    await expectGroupEqualsRows(view, [11000, -4000, 7000]);

    await view.release();
    // February complete: Travel 70.00 / -30.00 / 40.00 plus Food 20.00 /
    // -10.00 / 10.00.
    await expectGroupEqualsRows(view, [9000, -4000, 5000]);
  },
);

it.each(layouts)(
  'R2 %s: on a fresh mount an unloaded cell counts as the 0.00 its row shows',
  async (_, group) => {
    const view = setup(group, { heldSheet: 'budget202601' });
    await waitFor(() => expect(view.held.length).toBe(3));
    // Travel 50.00 / -30.00 / 20.00 beside Food's 0.00 / 0.00 / 0.00.
    await expectGroupEqualsRows(view, [5000, -3000, 2000]);

    await view.release();
    await expectGroupEqualsRows(view, [9000, -4000, 5000]);
  },
);

// MC-10.4 inspection 3, R1: an obsolete subscription's late reply never
// changes the group.
it.each(layouts)(
  'R1 %s: a late January reply leaves the February group equal to its rows',
  async (_, group) => {
    const view = setup(group, { heldSheet: 'budget202601', earlier: true });
    await waitFor(() => expect(view.held.length).toBe(3));
    await screen.findByRole('group', { name: 'Bills totals' });

    view.rerender('2026-02');
    await expectGroupEqualsRows(view, [9000, -4000, 5000]);

    await view.release();
    await expectGroupEqualsRows(view, [9000, -4000, 5000]);
  },
);
