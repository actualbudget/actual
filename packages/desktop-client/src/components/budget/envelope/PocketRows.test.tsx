import type { ReactNode } from 'react';

import { initServer } from '@actual-app/core/platform/client/connection';
import { render, screen, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

import {
  createTestAppStore,
  createTestQueryClient,
  TestProviders,
} from '#mocks';
import {
  k1Travel,
  rl6Reservations,
  rl6Travel,
  statusShop,
} from '#mocks/categoryPockets';
import { an2Months, sb1Months } from '#mocks/fxReservations';
import { mergeSyncedPrefs } from '#prefs/prefsSlice';

import {
  CategoryParentMonth,
  PocketParentMonth,
  PocketSlotMonth,
  slotRows,
} from './PocketRows';

vi.mock(
  '@actual-app/core/platform/client/connection',
  () => import('#mocks/connection'),
);

const plain = (text: string | null) => (text ?? '').replace(/[‪‬]/g, '');

function setup(children: ReactNode) {
  initServer({});
  const store = createTestAppStore();
  store.dispatch(
    mergeSyncedPrefs({
      defaultCurrencyCode: 'USD',
      amountEncoding: '{"version":1,"currencyCode":"USD","precision":2}',
    }),
  );
  render(
    <TestProviders store={store} queryClient={createTestQueryClient()}>
      {children}
    </TestProviders>,
  );
  return store;
}

// MC-10.4 desktop: a category with pockets shows noneditable totals.
it('AN2 shows the parent totals in the budget currency, not editable', () => {
  setup(<PocketParentMonth entry={an2Months['2026-01']} />);
  const totals = screen.getByRole('group', {
    name: 'Category totals in the budget currency',
  });
  expect(plain(totals.textContent)).toContain('$50.00');
  expect(plain(totals.textContent)).toContain('-$30.00');
  expect(plain(totals.textContent)).toContain('$20.00');
  expect(within(totals).queryByRole('textbox')).toBeNull();
  expect(within(totals).queryByRole('button')).toBeNull();
});

it('SB1 shows an out-of-range parent total as unavailable, never zero', () => {
  setup(<PocketParentMonth entry={sb1Months['2026-01']} />);
  const totals = screen.getByRole('group', {
    name: 'Category totals in the budget currency',
  });
  expect(within(totals).getByText('Unavailable')).toBeVisible();
});

it('AN2 shows a currency slot in native units', () => {
  setup(
    <PocketSlotMonth
      categoryId="travel"
      categoryName="Travel"
      month="2026-01"
      pocket={an2Months['2026-01'].pockets[0]}
      backing={undefined}
    />,
  );
  const slot = screen.getByRole('group', { name: 'Travel JPY, January 2026' });
  expect(plain(slot.textContent)).toContain('3,000');
  expect(plain(slot.textContent)).not.toContain('$');
});

it('K1 labels the included-rate valuation and the pending equivalent', () => {
  setup(
    <PocketSlotMonth
      categoryId="travel"
      categoryName="Travel"
      month="2026-01"
      pocket={k1Travel.pockets[0]}
      backing={undefined}
    />,
  );
  expect(screen.getByText('Valued at included rate')).toBeVisible();
  expect(screen.getByText('Pending')).toBeVisible();
});

it('RL6 labels the shortage and the carried unit value', () => {
  setup(
    <PocketSlotMonth
      categoryId="travel"
      categoryName="Travel"
      month="2026-02"
      pocket={rl6Travel.pockets[0]}
      backing={{ ...rl6Reservations.currencies[0].backing, precision: 0 }}
    />,
  );
  expect(screen.getByText('Reserved, not held')).toBeVisible();
  expect(screen.getByText('Valued at last unit value')).toBeVisible();
});

it('marks a slot whose lanes need repair', () => {
  setup(
    <PocketSlotMonth
      categoryId="shop"
      categoryName="Shop"
      month="2026-03"
      pocket={statusShop.pockets[0]}
      backing={undefined}
    />,
  );
  expect(screen.getByText('Needs repair')).toBeVisible();
});

it('a market slot has no labels', () => {
  setup(
    <PocketSlotMonth
      categoryId="travel"
      categoryName="Travel"
      month="2026-01"
      pocket={an2Months['2026-01'].pockets[0]}
      backing={{ reserved: 0, held: 0, shortage: false, precision: 0 }}
    />,
  );
  for (const label of [
    'Reserved, not held',
    'Pending',
    'Needs repair',
    'Valued at included rate',
  ]) {
    expect(screen.queryByText(label)).toBeNull();
  }
});

it('opens the slot details and menu for its month', async () => {
  const store = setup(
    <PocketSlotMonth
      categoryId="travel"
      categoryName="Travel"
      month="2026-01"
      pocket={an2Months['2026-01'].pockets[0]}
      backing={undefined}
    />,
  );
  await userEvent.click(
    screen.getByRole('button', {
      name: 'Details and actions for Travel JPY, January 2026',
    }),
  );
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

it('hides hidden slots unless hidden categories are shown', () => {
  const slots = [
    { id: 'a', currency: 'JPY', hidden: false },
    { id: 'b', currency: 'EUR', hidden: true },
  ];
  const ids = (showHidden: boolean) =>
    slotRows({ baseShown: false, slots }, showHidden).map(row =>
      row.type === 'pocket-slot' ? row.slot.id : row.type,
    );
  expect(ids(false)).toEqual(['a']);
  expect(ids(true)).toEqual(['a', 'b']);
  expect(slotRows(undefined, true)).toEqual([]);
});

// MC-10.4 inspection 1, F1 desktop: the base slot row follows its visibility.
it.each([
  ['hidden and empty', false, ['pocket-slot']],
  ['explicitly shown', true, ['base-slot', 'pocket-slot']],
  ['shown through activity', true, ['base-slot', 'pocket-slot']],
] as const)('F1 lists the base slot row when %s', (_, baseShown, types) => {
  const slots = [{ id: 'a', currency: 'JPY', hidden: false }];
  expect(slotRows({ baseShown, slots }, false).map(row => row.type)).toEqual(
    types,
  );
});

it('a category with pockets never edits in its parent row, even in a month without them', async () => {
  initServer({
    'envelope-budget-month': async () => [],
  });
  const store = createTestAppStore();
  store.dispatch(
    mergeSyncedPrefs({
      'flags.currency': 'true',
      'flags.multicurrency': 'true',
      budgetType: 'envelope',
      defaultCurrencyCode: 'USD',
      amountEncoding: '{"version":1,"currencyCode":"USD","precision":2}',
    }),
  );
  const MonthComponent = () => <input aria-label="Ordinary cells" />;
  const props = {
    MonthComponent,
    month: '2026-02',
    category: { id: 'travel', name: 'Travel', group: 'group' },
    editing: true,
    onEdit: vi.fn(),
    onBudgetAction: vi.fn(),
    onShowActivity: vi.fn(),
  };
  const { rerender } = render(
    <TestProviders store={store} queryClient={createTestQueryClient()}>
      <CategoryParentMonth {...props} hasPockets />
    </TestProviders>,
  );
  await new Promise(r => setTimeout(r, 20));
  expect(screen.queryByLabelText('Ordinary cells')).toBeNull();
  rerender(
    <TestProviders store={store} queryClient={createTestQueryClient()}>
      <CategoryParentMonth {...props} hasPockets={false} />
    </TestProviders>,
  );
  expect(screen.getByLabelText('Ordinary cells')).toBeVisible();
});
