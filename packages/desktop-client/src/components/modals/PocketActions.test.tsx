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
import { k1Travel, l1Food, pocketMonthCells } from '#mocks/categoryPockets';
import { fxValuationFixture } from '#mocks/fxValuation';
import { mergeLocalPrefs, mergeSyncedPrefs } from '#prefs/prefsSlice';

import { CategoryPocketModal } from './CategoryPocketModal';

vi.mock(
  '@actual-app/core/platform/client/connection',
  () => import('#mocks/connection'),
);

// MC-10.5 wires the slot actions MC-10.4 deferred for lack of handlers:
// native slot editing, per-slot carry, cover, transfer and finalize pending.

/** Travel JPY overspent (AN2 / CV1): -3000 JPY, beside Food's JPY slot. */
const travelOverspent: CategoryPocketsMonth = {
  ...k1Travel,
  pockets: [
    {
      ...k1Travel.pockets[0],
      budgeted: 0,
      budgetedBase: 0,
      spent: -3000,
      balance: -3000,
      incomplete: [],
      lanes: [
        {
          ...k1Travel.pockets[0].lanes[0],
          budgeted: 0,
          budgetedBase: 0,
          captureDate: null,
          spent: -3000,
          balance: -3000,
        },
      ],
    },
  ],
};

/** Food's IQD slot read at display precision 3 (WP5). */
const foodIqd: CategoryPocketsMonth = {
  ...l1Food,
  pockets: [
    {
      ...l1Food.pockets[0],
      id: 'foodIqd',
      currency: 'IQD',
      precision: 3,
      budgeted: 500,
      lanes: [
        {
          ...l1Food.pockets[0].lanes[0],
          laneId: 'foodIqd',
          encoding: 'IQD.0',
          budgeted: 0,
        },
      ],
    },
  ],
};

function setup(
  categoryId: string,
  pocketId: string,
  entries: Record<string, CategoryPocketsMonth>,
  responses: { transfer?: unknown[]; finalize?: unknown } = {},
) {
  const budgetSet = vi.fn().mockResolvedValue({ status: 'ok' });
  const carry = vi.fn().mockResolvedValue(undefined);
  const transfer = vi.fn();
  for (const response of responses.transfer ?? [{ status: 'ok' }]) {
    transfer.mockResolvedValueOnce(response);
  }
  const finalize = vi
    .fn()
    .mockResolvedValue(responses.finalize ?? { finalized: [], pending: [] });
  const state = { entries };
  const queryClient = createTestQueryClient();
  initServer({
    'envelope-budget-month': async ({ month }: { month: string }) =>
      pocketMonthCells(month, state.entries),
    'budget/fx-valuation': async () => ({
      ...fxValuationFixture,
      reservations: null,
    }),
    'budget/pocket-budget-set': budgetSet,
    'budget/set-carryover': carry,
    'budget/pocket-transfer': transfer,
    'budget/pockets-finalize': finalize,
    'budget/slot-meta-set': vi.fn(),
    'get-categories': async () => ({
      grouped: [],
      list: [
        { id: 'travel', name: 'Travel', group: 'group', is_income: false },
        { id: 'food', name: 'Food', group: 'group', is_income: false },
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
    <TestProviders store={store} queryClient={queryClient}>
      <HotkeysProvider>
        <CategoryPocketModal
          categoryId={categoryId}
          pocketId={pocketId}
          month="2026-01"
        />
      </HotkeysProvider>
    </TestProviders>,
  );
  /** A reader refresh while the sheet stays open. */
  async function refresh(next: Record<string, CategoryPocketsMonth>) {
    state.entries = next;
    await queryClient.invalidateQueries();
  }
  return { budgetSet, carry, transfer, finalize, refresh };
}

async function form(name: string) {
  return within(await screen.findByRole('form', { name }));
}

it('edits the slot budget at the precision it was read (WP5)', async () => {
  const { budgetSet } = setup('food', 'foodIqd', { food: foodIqd });
  const edit = await form('Edit IQD budget');
  await userEvent.clear(edit.getByLabelText('Budgeted (IQD)'));
  await userEvent.type(edit.getByLabelText('Budgeted (IQD)'), '1');
  await userEvent.click(edit.getByRole('button', { name: 'Save budget' }));
  expect(budgetSet).toHaveBeenCalledWith({
    month: '2026-01',
    pocketId: 'foodIqd',
    amount: 1000,
    encoding: 'IQD.3',
  });
});

it('turns rollover on for the slot from this month', async () => {
  const { carry } = setup('food', 'foodJpy', { food: l1Food });
  await userEvent.click(
    await screen.findByRole('button', { name: 'Turn rollover on' }),
  );
  expect(carry).toHaveBeenCalledWith({
    startMonth: '2026-01',
    category: 'foodJpy',
    flag: true,
  });
});

it('transfers native units to To Budget (CV3)', async () => {
  const { transfer } = setup('food', 'foodJpy', { food: l1Food });
  const move = await form('Transfer JPY');
  await userEvent.type(move.getByLabelText('Amount (JPY)'), '2000');
  await userEvent.selectOptions(move.getByLabelText('To'), 'to-budget');
  await userEvent.click(move.getByRole('button', { name: 'Transfer' }));
  expect(transfer).toHaveBeenCalledWith({
    month: '2026-01',
    from: 'foodJpy',
    to: 'to-budget',
    amount: { amount: 2000, encoding: 'JPY.0' },
  });
});

it('transfers to another slot in the same currency (CV2)', async () => {
  const { transfer } = setup('food', 'foodJpy', {
    food: l1Food,
    travel: travelOverspent,
  });
  const move = await form('Transfer JPY');
  await userEvent.type(move.getByLabelText('Amount (JPY)'), '2000');
  await userEvent.selectOptions(move.getByLabelText('To'), 'travelJpy');
  await userEvent.click(move.getByRole('button', { name: 'Transfer' }));
  expect(transfer).toHaveBeenCalledWith({
    month: '2026-01',
    from: 'foodJpy',
    to: 'travelJpy',
    amount: { amount: 2000, encoding: 'JPY.0' },
  });
});

it('covers overspending from a base category, completing a missing rate (CV1, CV4)', async () => {
  const { transfer } = setup(
    'travel',
    'travelJpy',
    { travel: travelOverspent },
    {
      transfer: [
        { status: 'rate-unavailable', needs: ['destinationAmount', 'rate'] },
        { status: 'ok' },
      ],
    },
  );
  const cover = await form('Cover JPY overspending');
  expect(cover.getByLabelText('Amount (JPY)')).toHaveValue('3,000');
  await userEvent.selectOptions(cover.getByLabelText('From'), 'food');
  await userEvent.click(cover.getByRole('button', { name: 'Cover' }));
  expect(transfer).toHaveBeenNthCalledWith(1, {
    month: '2026-01',
    from: 'food',
    to: 'travelJpy',
    destinationAmount: { amount: 3000, encoding: 'JPY.0' },
  });
  expect(
    await cover.findByText(
      'No exchange rate is available for this date. Enter the amount in USD.',
    ),
  ).toBeVisible();
  await userEvent.type(cover.getByLabelText('Amount (USD)'), '30');
  await userEvent.click(cover.getByRole('button', { name: 'Cover' }));
  expect(transfer).toHaveBeenNthCalledWith(2, {
    month: '2026-01',
    from: 'food',
    to: 'travelJpy',
    amount: 3000,
    destinationAmount: { amount: 3000, encoding: 'JPY.0' },
  });
});

it('offers no cover while the slot is not overspent', async () => {
  setup('food', 'foodJpy', { food: l1Food });
  await screen.findByRole('form', { name: 'Transfer JPY' });
  expect(
    screen.queryByRole('form', { name: 'Cover JPY overspending' }),
  ).toBeNull();
});

it('finalizes pending assignments and reports those still pending', async () => {
  const { finalize } = setup(
    'travel',
    'travelJpy',
    { travel: k1Travel },
    {
      finalize: {
        finalized: [],
        pending: [{ id: '202601-travelJpy', reason: 'rate-unavailable' }],
      },
    },
  );
  await userEvent.click(
    await screen.findByRole('button', {
      name: 'Finalize pending assignments',
    }),
  );
  expect(finalize).toHaveBeenCalledWith({
    cells: [{ month: '2026-01', laneId: 'travelJpy' }],
  });
  expect(
    await screen.findByText(
      '1 assignment is still pending: no exchange rate for its date.',
    ),
  ).toBeVisible();
});

it('reports an encoding mismatch and keeps the sheet open', async () => {
  const { budgetSet } = setup('food', 'foodIqd', { food: foodIqd });
  budgetSet.mockResolvedValueOnce({ status: 'encoding-mismatch' });
  const edit = await form('Edit IQD budget');
  await userEvent.clear(edit.getByLabelText('Budgeted (IQD)'));
  await userEvent.type(edit.getByLabelText('Budgeted (IQD)'), '2');
  await userEvent.click(edit.getByRole('button', { name: 'Save budget' }));
  expect(
    await edit.findByText(
      'The amount was read in another currency or precision. Enter it again.',
    ),
  ).toBeVisible();
});

// MC-10.5 inspection 1, F1: an amount keeps the encoding it was entered at
// when a reader refresh changes the slot's display precision before submit.
function iqdSlot(precision: number, budgeted: number, balance: number) {
  return {
    food: {
      ...foodIqd,
      pockets: [{ ...foodIqd.pockets[0], precision, budgeted, balance }],
    },
  };
}

async function precisionRefreshed(
  refresh: (next: Record<string, CategoryPocketsMonth>) => Promise<void>,
) {
  await refresh(iqdSlot(3, 1000, -2000));
  // The refreshed slot is on screen before submitting.
  const totals = await screen.findByRole('region', { name: 'IQD slot' });
  await vi.waitFor(() =>
    expect(totals.textContent?.replace(/[‪‬]/g, '')).toContain('IQD2.000'),
  );
}

it('F1 keeps a typed budget at its entry encoding across a refresh', async () => {
  const { budgetSet, refresh } = setup('food', 'foodIqd', iqdSlot(0, 0, 0));
  const edit = await form('Edit IQD budget');
  await userEvent.clear(edit.getByLabelText('Budgeted (IQD)'));
  await userEvent.type(edit.getByLabelText('Budgeted (IQD)'), '1');
  await precisionRefreshed(refresh);
  await userEvent.click(edit.getByRole('button', { name: 'Save budget' }));
  expect(budgetSet).toHaveBeenCalledWith({
    month: '2026-01',
    pocketId: 'foodIqd',
    amount: 1,
    encoding: 'IQD.0',
  });
});

it('F1 keeps the initial budget at its read encoding across a refresh', async () => {
  const { budgetSet, refresh } = setup('food', 'foodIqd', iqdSlot(0, 1, -2));
  const edit = await form('Edit IQD budget');
  await precisionRefreshed(refresh);
  await userEvent.click(edit.getByRole('button', { name: 'Save budget' }));
  expect(budgetSet).toHaveBeenCalledWith({
    month: '2026-01',
    pocketId: 'foodIqd',
    amount: 1,
    encoding: 'IQD.0',
  });
});

it('F1 keeps a transfer amount at its entry encoding across a refresh', async () => {
  const { transfer, refresh } = setup('food', 'foodIqd', iqdSlot(0, 0, 0));
  const move = await form('Transfer IQD');
  await userEvent.type(move.getByLabelText('Amount (IQD)'), '1');
  await precisionRefreshed(refresh);
  await userEvent.click(move.getByRole('button', { name: 'Transfer' }));
  expect(transfer).toHaveBeenCalledWith({
    month: '2026-01',
    from: 'foodIqd',
    to: 'to-budget',
    amount: { amount: 1, encoding: 'IQD.0' },
  });
});

it('F1 keeps the initial cover amount at its read encoding across a refresh', async () => {
  const { transfer, refresh } = setup('food', 'foodIqd', iqdSlot(0, 0, -2));
  const cover = await form('Cover IQD overspending');
  await precisionRefreshed(refresh);
  await userEvent.click(cover.getByRole('button', { name: 'Cover' }));
  expect(transfer).toHaveBeenCalledWith({
    month: '2026-01',
    from: 'to-budget',
    to: 'foodIqd',
    destinationAmount: { amount: 2, encoding: 'IQD.0' },
  });
});
