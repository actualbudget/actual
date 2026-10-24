import type { ReactNode } from 'react';
import { HotkeysProvider } from 'react-hotkeys-hook';

import { initServer } from '@actual-app/core/platform/client/connection';
import type { BaseLaneMonth } from '@actual-app/core/server/budget/base-slots';
import { onlineManager } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

import { BaseSlotSidebar } from '#components/budget/envelope/PocketRows';
import { MonthsContext } from '#components/budget/MonthsContext';
import { PocketSlotRows } from '#components/mobile/budget/PocketRows';
import {
  createTestAppStore,
  createTestQueryClient,
  TestProviders,
} from '#mocks';
import { l1Food } from '#mocks/categoryPockets';
import { mergeLocalPrefs, mergeSyncedPrefs } from '#prefs/prefsSlice';

import { BaseSlotModal } from './BaseSlotModal';

vi.mock(
  '@actual-app/core/platform/client/connection',
  () => import('#mocks/connection'),
);

// MC-10.6 fix round 1 (F4): a base slot's lanes and their repairs, opened
// from the base row on desktop and mobile. Base amounts are integers in the
// budget encoding.

const lane = (
  fields: Partial<BaseLaneMonth> & Pick<BaseLaneMonth, 'laneId'>,
): BaseLaneMonth => ({
  kind: 'inherited',
  originCategoryId: 'travel',
  status: 'retired',
  budgeted: 0,
  spent: 0,
  carryIn: 0,
  balance: 0,
  carryover: false,
  ...fields,
});

/** Own -10.00 beside an inherited +10.00 (rollover off), a duplicate and an unresolved lane. */
const foodLanes = {
  slotId: 'food',
  lanes: [
    lane({
      laneId: 'food',
      kind: 'own',
      originCategoryId: 'food',
      status: 'live',
      budgeted: -1000,
      balance: -1000,
    }),
    lane({ laneId: 'travel', budgeted: 1000, balance: 1000 }),
    lane({
      laneId: 'foodBase2',
      originCategoryId: 'food',
      status: 'duplicate',
    }),
    lane({ laneId: 'lostBase', status: 'unresolved', budgeted: 500 }),
  ],
};

function setup(children: ReactNode) {
  const calls = {
    lanes: vi.fn().mockResolvedValue(foodLanes),
    move: vi.fn().mockResolvedValue({ status: 'ok' }),
    merge: vi.fn().mockResolvedValue(undefined),
    chooseOwner: vi.fn().mockResolvedValue(undefined),
  };
  initServer({
    'budget/base-slot-lanes': calls.lanes,
    'budget/pocket-move-inherited': calls.move,
    'budget/pocket-merge': calls.merge,
    'budget/pocket-choose-owner': calls.chooseOwner,
    'get-categories': async () => ({
      grouped: [],
      list: [
        { id: 'travel', name: 'Travel', group: 'group', is_income: false },
        { id: 'food', name: 'Food', group: 'group', is_income: false },
        { id: 'shop', name: 'Shop', group: 'group', is_income: false },
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
      <HotkeysProvider>{children}</HotkeysProvider>
    </TestProviders>,
  );
  const opened = () =>
    store
      .getState()
      .modals.modalStack.filter(modal => modal.name === 'base-slot')
      .map(modal => modal.options);
  return { ...calls, opened };
}

async function form(name: string) {
  return within(await screen.findByRole('form', { name }));
}

const modal = <BaseSlotModal categoryId="food" month="2026-01" />;

it('lists every lane of the base slot', async () => {
  const { lanes } = setup(modal);
  const list = await screen.findByRole('list', { name: 'Base budget lanes' });
  expect(within(list).getAllByRole('listitem')).toHaveLength(4);
  expect(lanes).toHaveBeenCalledWith({ month: '2026-01', category: 'food' });
});

it('moves an inherited balance as a budget-currency integer', async () => {
  const { move } = setup(modal);
  const repair = await form('Move from Travel');
  await userEvent.type(repair.getByLabelText('Amount (USD)'), '10');
  await userEvent.click(
    repair.getByRole('button', { name: 'Move to this slot' }),
  );
  expect(move).toHaveBeenCalledWith({
    month: '2026-01',
    slotId: 'food',
    laneId: 'travel',
    amount: 1000,
  });
});

it('merges a duplicate base lane', async () => {
  const { merge } = setup(modal);
  await userEvent.click(
    await screen.findByRole('button', { name: 'Merge into this slot' }),
  );
  expect(merge).toHaveBeenCalledWith({ laneId: 'foodBase2' });
});

it('chooses an owner for an unresolved base lane', async () => {
  const { chooseOwner } = setup(modal);
  const owner = await form('Choose owner for Travel lane');
  await userEvent.selectOptions(owner.getByLabelText('Owner'), 'shop');
  await userEvent.click(owner.getByRole('button', { name: 'Choose owner' }));
  expect(chooseOwner).toHaveBeenCalledWith({
    laneId: 'lostBase',
    categoryId: 'shop',
  });
});

it('reads another month', async () => {
  const { lanes } = setup(modal);
  await screen.findByRole('list', { name: 'Base budget lanes' });
  await userEvent.click(screen.getByRole('button', { name: 'Next month' }));
  await screen.findByText('February 2026');
  expect(lanes).toHaveBeenLastCalledWith({
    month: '2026-02',
    category: 'food',
  });
});

it('shows the desktop base currency without opening redundant details', async () => {
  const { opened } = setup(
    <MonthsContext.Provider
      value={{ months: ['2026-01', '2026-02'], type: 'envelope' }}
    >
      <BaseSlotSidebar />
    </MonthsContext.Provider>,
  );
  await userEvent.click(screen.getByText('USD'));
  expect(opened()).toEqual([]);
  expect(
    screen.queryByRole('button', {
      name: 'Lanes and repairs for Food base budget',
    }),
  ).toBeNull();
});

it('shows the mobile base currency without opening redundant details', async () => {
  const { opened } = setup(
    <PocketSlotRows
      category={{ id: 'food', name: 'Food', group: 'group' }}
      month="2026-01"
      entry={l1Food}
      baseCells={<span />}
      show3Columns
      showBudgetedColumn
    />,
  );
  await userEvent.click(screen.getByText('USD'));
  expect(opened()).toEqual([]);
  expect(
    screen.queryByRole('button', {
      name: 'Lanes and repairs for Food base budget',
    }),
  ).toBeNull();
});

// Fix round 2 (N2): the lanes are a local read, so they load offline.
it('reads the lanes while offline', async () => {
  onlineManager.setOnline(false);
  onTestFinished(() => onlineManager.setOnline(true));
  const { lanes } = setup(modal);
  expect(
    await screen.findByRole('list', { name: 'Base budget lanes' }),
  ).toBeVisible();
  expect(lanes).toHaveBeenCalledWith({ month: '2026-01', category: 'food' });
});
