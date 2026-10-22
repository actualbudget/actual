import { HotkeysProvider } from 'react-hotkeys-hook';

import { initServer } from '@actual-app/core/platform/client/connection';
import type {
  CategoryPocketsMonth,
  ReservationsBridge,
} from '@actual-app/core/server/budget/pocket-readers';
import { render, screen, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

import {
  createTestAppStore,
  createTestQueryClient,
  TestProviders,
} from '#mocks';
import {
  k1Travel,
  l1Food,
  pocketMonthCells,
  rl6Reservations,
  rl6Travel,
  statusShop,
} from '#mocks/categoryPockets';
import { an1Jpy } from '#mocks/fxReservations';
import { fxValuationFixture } from '#mocks/fxValuation';
import { mergeLocalPrefs, mergeSyncedPrefs } from '#prefs/prefsSlice';

import { CategoryPocketModal } from './CategoryPocketModal';

vi.mock(
  '@actual-app/core/platform/client/connection',
  () => import('#mocks/connection'),
);

const plain = (text: string | null) => (text ?? '').replace(/[‪‬]/g, '');

function setup(
  categoryId: string,
  entry: CategoryPocketsMonth,
  pocketId: string,
  reservations: ReservationsBridge | null = null,
) {
  const metaSet = vi.fn().mockResolvedValue(undefined);
  initServer({
    'envelope-budget-month': async ({ month }: { month: string }) =>
      pocketMonthCells(month, { [categoryId]: entry }),
    'budget/fx-valuation': async () => ({
      ...fxValuationFixture,
      reservations,
    }),
    'budget/slot-meta-set': metaSet,
    'get-categories': async () => ({
      grouped: [],
      list: [
        { id: 'travel', name: 'Travel', group: 'group' },
        { id: 'food', name: 'Food', group: 'group' },
        { id: 'shop', name: 'Shop', group: 'group' },
      ],
    }),
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
      <HotkeysProvider>
        <CategoryPocketModal
          categoryId={categoryId}
          pocketId={pocketId}
          month="2026-01"
        />
      </HotkeysProvider>
    </TestProviders>,
  );
  return { metaSet };
}

async function lanes() {
  const list = await screen.findByRole('list', { name: 'Budget lanes' });
  return within(list).getAllByRole('listitem');
}

// MC-10.4: one accessible details control per slot, on desktop and mobile.
it('L1 lists the own lane and the inherited Travel lane with their figures', async () => {
  setup('food', l1Food, 'foodJpy');
  expect(await screen.findByText('Food: JPY')).toBeVisible();
  const totals = screen.getByRole('region', { name: 'JPY slot' });
  expect(plain(totals.textContent)).toContain('15,000');
  expect(plain(totals.textContent)).toContain('7,000');
  expect(plain(totals.textContent)).toContain('$70.00');
  const [own, inherited] = await lanes();
  expect(own).toHaveTextContent('Food');
  expect(own).toHaveTextContent('Own lane');
  expect(inherited).toHaveTextContent('Travel');
  expect(inherited).toHaveTextContent('Inherited');
  expect(plain(inherited.textContent)).toContain('-¥3,000');
  expect(plain(inherited.textContent)).toContain('-$30.00');
});

it('names duplicate, orphan and unresolved lanes and the reason', async () => {
  setup('shop', statusShop, 'shopJpy');
  const items = await lanes();
  expect(items).toHaveLength(4);
  expect(items[1]).toHaveTextContent('Duplicate');
  expect(items[2]).toHaveTextContent('Orphan');
  expect(items[3]).toHaveTextContent('Unresolved owner');
  expect(
    screen.getByText('A lane in this slot has no resolved owner.'),
  ).toBeVisible();
});

it('K1 shows a pending base and an unavailable value with the reason', async () => {
  setup('travel', k1Travel, 'travelJpy');
  const totals = await screen.findByRole('region', { name: 'JPY slot' });
  expect(within(totals).getByText('Valued at included rate')).toBeVisible();
  expect(
    within(totals).getByText('No exchange rate is available for this date.'),
  ).toBeVisible();
  const [own] = await lanes();
  expect(own).toHaveTextContent('Pending since 2026-01-10');
  expect(own).toHaveTextContent('Value unavailable');
});

it('RL6 shows the backing shortage', async () => {
  setup('travel', rl6Travel, 'travelJpy', rl6Reservations);
  const backing = await screen.findByRole('region', { name: 'JPY backing' });
  expect(within(backing).getByText('Reserved, not held')).toBeVisible();
  const row = (label: string) =>
    plain(within(backing).getByText(label).closest('div')!.textContent);
  expect(row('Reserved')).toContain('10,000');
  expect(row('Held')).toMatch(/0$/);
});

it('hides and shows the slot through its slot metadata', async () => {
  const { metaSet } = setup('food', l1Food, 'foodJpy');
  await userEvent.click(
    await screen.findByRole('button', { name: 'Hide currency' }),
  );
  expect(metaSet).toHaveBeenCalledWith({ id: 'foodJpy', hidden: true });
});

// MC-10.4 inspection 1, F2: backing is at the explanation's precision.
it('F2 formats backing at the currency explanation precision, not the slot', async () => {
  const slot = {
    ...l1Food,
    pockets: [
      {
        ...l1Food.pockets[0],
        id: 'foodIqd',
        currency: 'IQD',
        precision: 0,
        budgeted: 13000,
        balance: 13000,
        lanes: [
          {
            ...l1Food.pockets[0].lanes[0],
            laneId: 'foodIqd',
            encoding: 'IQD.0',
            budgeted: 13000,
            balance: 13000,
          },
        ],
      },
    ],
  };
  setup('food', slot, 'foodIqd', {
    ...rl6Reservations,
    currencies: [
      {
        ...an1Jpy,
        currency: 'IQD',
        precision: 3,
        backing: { reserved: 13000000, held: 26000000, shortage: false },
      },
    ],
  });
  const backing = await screen.findByRole('region', { name: 'IQD backing' });
  const row = (label: string) =>
    plain(within(backing).getByText(label).closest('div')!.textContent);
  expect(row('Reserved')).toMatch(/13,000(\.000)?$/);
  expect(row('Held')).toMatch(/26,000(\.000)?$/);
  // Slot amounts stay at the slot's own scale.
  const totals = screen.getByRole('region', { name: 'IQD slot' });
  expect(plain(totals.textContent)).toContain('13,000');
  expect(plain(totals.textContent)).not.toContain('13.000');
});
