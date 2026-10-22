import {
  initServer,
  serverPush,
} from '@actual-app/core/platform/client/connection';
import type { CategoryPocketsMonth } from '@actual-app/core/server/budget/pocket-readers';
import type { CategoryGroupEntity } from '@actual-app/core/types/models';
import { act, render, screen, waitFor, within } from '@testing-library/react';

import { usePocketInvalidation } from '#hooks/useCategoryPockets';
import { SheetNameProvider } from '#hooks/useSheetName';
import {
  createTestAppStore,
  createTestQueryClient,
  TestProviders,
} from '#mocks';
import { pocketMonthCells } from '#mocks/categoryPockets';
import { an2Months, sb1Months } from '#mocks/fxReservations';
import { resetCells, setCells } from '#mocks/liveSpreadsheet';
import { mergeLocalPrefs, mergeSyncedPrefs } from '#prefs/prefsSlice';

import { ExpenseGroupHeader } from './ExpenseGroupListItem';

vi.mock(
  '@actual-app/core/platform/client/connection',
  () => import('#mocks/connection'),
);
vi.mock('#hooks/useSpreadsheet', () => import('#mocks/liveSpreadsheet'));

const plain = (text: string | null) => (text ?? '').replace(/[‪‬]/g, '');
const m = 2251799813685247; // MAX_SAFE_NUMBER

const bills = {
  id: 'group',
  name: 'Bills',
  categories: [
    { id: 'travel', name: 'Travel', group: 'group' },
    { id: 'food', name: 'Food', group: 'group' },
  ],
} as CategoryGroupEntity;

// Travel's base lane 50.00 / 0 / 50.00 and Food's ordinary 40.00 / -10.00 /
// 30.00; the group cells sum them.
const billsCells = {
  'budget-travel': 5000,
  'sum-amount-travel': 0,
  'leftover-travel': 5000,
  'budget-food': 4000,
  'sum-amount-food': -1000,
  'leftover-food': 3000,
  'group-budget-group': 9000,
  'group-sum-amount-group': -1000,
  'group-leftover-group': 8000,
};

type Cells = ReturnType<typeof pocketMonthCells>;
let respond: (month: string) => Cells | Promise<Cells>;

function Fresh() {
  usePocketInvalidation();
  return null;
}

function setup(
  entries: Record<string, CategoryPocketsMonth>,
  group = bills,
  values: Record<string, number> = billsCells,
) {
  resetCells(values);
  respond = month => pocketMonthCells(month, entries);
  const read = vi.fn(async ({ month }: { month: string }) => respond(month));
  initServer({ 'envelope-budget-month': read });
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
      <SheetNameProvider name="budget202601">
        <Fresh />
        <ExpenseGroupHeader
          categoryGroup={group}
          month="2026-01"
          show3Columns
          showBudgetedColumn
          onEditCategoryGroup={vi.fn()}
          isCollapsed={() => false}
          onToggleCollapse={vi.fn()}
          isHidden={false}
        />
      </SheetNameProvider>
    </TestProviders>,
  );
  return { store, read };
}

const row = () => screen.getByTestId('category-group-row');
const totals = (name = 'Bills') =>
  screen.findByRole('group', { name: `${name} totals` });
const text = async (name?: string) => plain((await totals(name)).textContent);

// MC-10.4 G1 mobile: a group shows the sum of its displayed categories.
it('G1 a mixed group sums the pocket parent total and the plain category', async () => {
  setup({ travel: an2Months['2026-01'] });
  expect(await text()).toBe('$90.00-$40.00$50.00');
});

it('G1 an all-plain group shows its existing cells', async () => {
  setup({});
  await act(() => new Promise(r => setTimeout(r, 20)));
  expect(screen.queryByRole('group', { name: 'Bills totals' })).toBeNull();
  const shown = plain(row().textContent);
  expect(shown).toContain('$90.00');
  expect(shown).toContain('-$10.00');
  expect(shown).toContain('$80.00');
});

it('G1 an unknown category value makes the group value unknown, with its reason', async () => {
  setup({ travel: sb1Months['2026-01'] });
  const unknown = within(await totals()).getByTitle(
    'Unknown because Travel has an unknown amount.',
  );
  expect(unknown).toHaveTextContent('Unavailable');
  expect(await text()).toBe('$40.00Unavailable$29.98');
});

it('G1 switching back to tracking shows the existing cells', async () => {
  const { store } = setup({ travel: an2Months['2026-01'] });
  await totals();
  act(() => {
    store.dispatch(mergeSyncedPrefs({ budgetType: 'tracking' }));
  });
  expect(screen.queryByRole('group', { name: 'Bills totals' })).toBeNull();
});

// MC-10.4 inspection 2, N1: the group never mixes refresh states.
it('N1 the group equals its displayed categories while a base edit awaits the reader', async () => {
  const { read } = setup({ travel: an2Months['2026-01'] });
  expect(await text()).toBe('$90.00-$40.00$50.00');

  let release: (cells: Cells) => void = () => undefined;
  const held = new Promise<Cells>(resolve => {
    release = resolve;
  });
  respond = () => held;
  const calls = read.mock.calls.length;
  act(() => {
    setCells({
      'budget-travel': 7000,
      'leftover-travel': 7000,
      'group-budget-group': 11000,
      'group-leftover-group': 10000,
    });
  });
  serverPush('cells-changed', [
    { name: 'budget202601!budget-travel', value: 7000 },
  ]);
  await waitFor(() => expect(read.mock.calls.length).toBe(calls + 1));
  expect(await text()).toBe('$90.00-$40.00$50.00');

  await act(async () => {
    release(
      pocketMonthCells('2026-01', {
        travel: {
          ...an2Months['2026-01'],
          budgeted: 7000,
          balance: 4000,
          base: { ...an2Months['2026-01'].base, budgeted: 7000, balance: 7000 },
        },
      }),
    );
  });
  await waitFor(async () => expect(await text()).toBe('$110.00-$40.00$70.00'));
});

// MC-10.4 inspection 2, N2: exact sums, bounded once.
function manyGroup(amounts: number[]) {
  const ids = amounts.map((_, i) => `c${i}`);
  const group = {
    id: 'many',
    name: 'Many',
    categories: ids.map(id => ({ id, name: id, group: 'many' })),
  } as CategoryGroupEntity;
  const entries = Object.fromEntries(
    ids.map((id, i) => [
      id,
      {
        ...an2Months['2026-01'],
        budgeted: amounts[i],
        spent: 0,
        balance: amounts[i],
        base: { ...an2Months['2026-01'].base, budgeted: 0, balance: 0 },
      },
    ]),
  );
  return { group, entries };
}

it('N2 an intermediate sum beyond the bound that cancels is exact', async () => {
  const { group, entries } = manyGroup([m, m, m, m, m, -m, -m, -m, -m, -m]);
  setup(entries, group, {});
  expect(await text('Many')).toBe('$0.00$0.00$0.00');
});

it('N2 a final sum beyond the bound is unavailable with its reason', async () => {
  const { group, entries } = manyGroup([m, m]);
  setup(entries, group, {});
  const shown = await totals('Many');
  expect(
    within(shown).getAllByTitle('An amount exceeds supported bounds.'),
  ).toHaveLength(2);
  expect(plain(shown.textContent)).toBe('Unavailable$0.00Unavailable');
});
