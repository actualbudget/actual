import { HotkeysProvider } from 'react-hotkeys-hook';

import { initServer } from '@actual-app/core/platform/client/connection';
import type { CategoryPocketsMonth } from '@actual-app/core/server/budget/pocket-readers';
import { render, screen, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

import {
  createTestAppStore,
  createTestQueryClient,
  TestProviders,
} from '#mocks';
import {
  l1Food,
  orphanFood,
  pocketMonthCells,
  statusShop,
  unresolvedShop,
} from '#mocks/categoryPockets';
import { fxValuationFixture } from '#mocks/fxValuation';
import { mergeLocalPrefs, mergeSyncedPrefs } from '#prefs/prefsSlice';

import { CategoryPocketModal } from './CategoryPocketModal';

vi.mock(
  '@actual-app/core/platform/client/connection',
  () => import('#mocks/connection'),
);

// MC-10.6 wires the deletion and repair actions MC-10.4 deferred: deleting
// a currency slot or the base child, Move inherited balance, Merge, Choose
// owner and re-entry of a mismatched amount.

/** Food's JPY slot with Travel's retired lane stamped in another currency. */
const mismatched: CategoryPocketsMonth = {
  ...l1Food,
  pockets: [
    {
      ...l1Food.pockets[0],
      budgeted: null,
      incomplete: ['pair-encoding-mismatch'],
      lanes: [
        l1Food.pockets[0].lanes[0],
        { ...l1Food.pockets[0].lanes[1], budgeted: null, budgetedBase: null },
      ],
    },
  ],
};

function setup(
  categoryId: string,
  pocketId: string,
  entries: Record<string, CategoryPocketsMonth>,
  { deleteError = false } = {},
) {
  const calls = {
    pocketDelete: vi.fn(async () => {
      if (deleteError) throw new Error('transfer-required');
    }),
    baseDelete: vi.fn().mockResolvedValue(undefined),
    move: vi.fn().mockResolvedValue({ status: 'ok' }),
    merge: vi.fn().mockResolvedValue(undefined),
    chooseOwner: vi.fn().mockResolvedValue(undefined),
    reenter: vi.fn().mockResolvedValue({ status: 'ok' }),
  };
  initServer({
    'envelope-budget-month': async ({ month }: { month: string }) =>
      pocketMonthCells(month, entries),
    'budget/fx-valuation': async () => ({
      ...fxValuationFixture,
      reservations: null,
    }),
    'budget/pocket-delete': calls.pocketDelete,
    'budget/base-child-delete': calls.baseDelete,
    'budget/pocket-move-inherited': calls.move,
    'budget/pocket-merge': calls.merge,
    'budget/pocket-choose-owner': calls.chooseOwner,
    'budget/pocket-reenter': calls.reenter,
    'budget/slot-meta-set': vi.fn(),
    'get-categories': async () => ({
      grouped: [],
      list: [
        { id: 'travel', name: 'Travel', group: 'group', is_income: false },
        { id: 'food', name: 'Food', group: 'group', is_income: false },
        { id: 'shop', name: 'Shop', group: 'group', is_income: false },
        { id: 'salary', name: 'Salary', group: 'income', is_income: true },
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
  return calls;
}

async function form(name: string) {
  return within(await screen.findByRole('form', { name }));
}

it('deletes the currency slot into another category', async () => {
  const { pocketDelete } = setup('food', 'foodJpy', { food: l1Food });
  const remove = await form('Delete JPY');
  // Income categories cannot receive expense history.
  expect(
    within(remove.getByLabelText('Move its history to')).queryByText('Salary'),
  ).toBeNull();
  await userEvent.selectOptions(
    remove.getByLabelText('Move its history to'),
    'travel',
  );
  await userEvent.click(
    remove.getByRole('button', { name: 'Delete currency' }),
  );
  expect(pocketDelete).toHaveBeenCalledWith({
    id: 'foodJpy',
    transferId: 'travel',
  });
});

it('asks for a destination when the slot has history', async () => {
  const { pocketDelete } = setup(
    'food',
    'foodJpy',
    { food: l1Food },
    { deleteError: true },
  );
  const remove = await form('Delete JPY');
  await userEvent.click(
    remove.getByRole('button', { name: 'Delete currency' }),
  );
  expect(pocketDelete).toHaveBeenCalledWith({ id: 'foodJpy' });
  expect(
    await remove.findByText(
      'Choose a category to receive this history, then delete again.',
    ),
  ).toBeVisible();
});

it('deletes the base child into another category', async () => {
  const { baseDelete } = setup('food', 'foodJpy', { food: l1Food });
  const remove = await form('Delete base budget');
  await userEvent.selectOptions(
    remove.getByLabelText('Move its history to'),
    'shop',
  );
  await userEvent.click(
    remove.getByRole('button', { name: 'Delete base budget' }),
  );
  expect(baseDelete).toHaveBeenCalledWith({
    category: 'food',
    transferId: 'shop',
  });
});

it('moves an inherited balance at the precision it was read (WP1)', async () => {
  const { move } = setup('food', 'foodJpy', { food: l1Food });
  const repair = await form('Move from Travel');
  await userEvent.type(repair.getByLabelText('Amount (JPY)'), '2000');
  await userEvent.click(
    repair.getByRole('button', { name: 'Move to this slot' }),
  );
  expect(move).toHaveBeenCalledWith({
    month: '2026-01',
    slotId: 'foodJpy',
    laneId: 'travelJpy',
    amount: { amount: 2000, encoding: 'JPY.0' },
  });
});

it.each([
  [0, 'shopJpy2'],
  [1, 'oldJpy'],
])('merges a duplicate or orphan lane (button %i)', async (index, laneId) => {
  const { merge } = setup('shop', 'shopJpy', { shop: statusShop });
  const merges = await screen.findAllByRole('button', {
    name: 'Merge into this slot',
  });
  // The duplicate and the orphan; the unresolved lane chooses an owner.
  expect(merges).toHaveLength(2);
  await userEvent.click(merges[index]);
  expect(merge).toHaveBeenCalledWith({ laneId });
});

it('chooses an owner for an unresolved lane', async () => {
  const { chooseOwner } = setup('shop', 'shopJpy', { shop: statusShop });
  const owner = await form('Choose owner for Shop lane');
  await userEvent.selectOptions(owner.getByLabelText('Owner'), 'food');
  await userEvent.click(owner.getByRole('button', { name: 'Choose owner' }));
  expect(chooseOwner).toHaveBeenCalledWith({
    laneId: 'lateJpy',
    categoryId: 'food',
  });
});

it('re-enters a mismatched amount on the lane that holds it (MM1)', async () => {
  const { reenter } = setup('food', 'foodJpy', { food: mismatched });
  const repair = await form('Re-enter Travel amount');
  await userEvent.type(repair.getByLabelText('Amount (JPY)'), '1000');
  await userEvent.click(repair.getByRole('button', { name: 'Save amount' }));
  expect(reenter).toHaveBeenCalledWith({
    month: '2026-01',
    laneId: 'travelJpy',
    amount: 1000,
    encoding: 'JPY.0',
  });
});

// Fix round 1 (F3): lanes without an owner, in the shapes the production
// reader returns (pocket-deletion.test.ts "reader shapes for repairs").
it('offers Choose owner for an unresolved lane reported as its own slot (W3)', async () => {
  const { chooseOwner, move } = setup('shop', 'lateJpy', {
    shop: unresolvedShop,
  });
  const owner = await form('Choose owner for Shop lane');
  expect(screen.queryByRole('form', { name: 'Move from Shop' })).toBeNull();
  await userEvent.selectOptions(owner.getByLabelText('Owner'), 'food');
  await userEvent.click(owner.getByRole('button', { name: 'Choose owner' }));
  expect(chooseOwner).toHaveBeenCalledWith({
    laneId: 'lateJpy',
    categoryId: 'food',
  });
  expect(move).not.toHaveBeenCalled();
});

it('offers Merge for an orphan without a destination slot', async () => {
  const { merge } = setup('food', 'travelJpy', { food: orphanFood });
  await userEvent.click(
    await screen.findByRole('button', { name: 'Merge into this slot' }),
  );
  expect(merge).toHaveBeenCalledWith({ laneId: 'travelJpy' });
});
