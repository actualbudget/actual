import type { ReactNode } from 'react';

import {
  initServer,
  serverPush,
} from '@actual-app/core/platform/client/connection';
import { act, renderHook, waitFor } from '@testing-library/react';

import {
  createTestAppStore,
  createTestQueryClient,
  TestProviders,
} from '#mocks';
import {
  pocketMonthCells,
  rl6Reservations,
  rl6Travel,
} from '#mocks/categoryPockets';
import { an2Months } from '#mocks/fxReservations';
import { fxValuationFixture } from '#mocks/fxValuation';
import { mergeLocalPrefs, mergeSyncedPrefs } from '#prefs/prefsSlice';

import {
  useCategoryPockets,
  usePocketBacking,
  usePocketSlots,
} from './useCategoryPockets';

vi.mock(
  '@actual-app/core/platform/client/connection',
  () => import('#mocks/connection'),
);

const available = {
  'flags.currency': 'true',
  'flags.multicurrency': 'true',
  defaultCurrencyCode: 'USD',
  amountEncoding: '{"version":1,"currencyCode":"USD","precision":2}',
  budgetType: 'envelope',
} as const;

function wrapperFor(prefs: Record<string, string> = available) {
  const store = createTestAppStore();
  store.dispatch(mergeLocalPrefs({ id: 'file-a' }));
  store.dispatch(mergeSyncedPrefs(prefs));
  const queryClient = createTestQueryClient();
  return ({ children }: { children: ReactNode }) => (
    <TestProviders store={store} queryClient={queryClient}>
      {children}
    </TestProviders>
  );
}

const jpyEur = {
  ...an2Months['2026-01'],
  pockets: [
    ...an2Months['2026-01'].pockets,
    { ...an2Months['2026-01'].pockets[0], id: 'travelEur', currency: 'EUR' },
  ],
};

// MC-10.4: the budget UI reads the MC-10.3 envelope-budget-month pockets.
it('AN2 reads each affected category of a month', async () => {
  const read = vi.fn(async ({ month }: { month: string }) =>
    pocketMonthCells(month, { travel: an2Months[month] }),
  );
  initServer({ 'envelope-budget-month': read });
  const { result } = renderHook(() => useCategoryPockets('2026-01'), {
    wrapper: wrapperFor(),
  });
  await waitFor(() => expect(result.current.get('travel')).toBeDefined());
  const travel = result.current.get('travel')!;
  expect(travel.budgeted).toBe(5000);
  expect(travel.spent).toBe(-3000);
  expect(travel.balance).toBe(2000);
  expect(travel.pockets.map(p => [p.currency, p.spent])).toEqual([
    ['JPY', -3000],
  ]);
  expect(read).toHaveBeenCalledWith({ month: '2026-01' });
});

it('reads nothing without multicurrency or for a tracking budget', async () => {
  const read = vi.fn(async () => pocketMonthCells('2026-01', {}));
  initServer({ 'envelope-budget-month': read });
  for (const prefs of [
    { ...available, 'flags.multicurrency': 'false' },
    { ...available, budgetType: 'tracking' },
  ]) {
    const { result } = renderHook(() => useCategoryPockets('2026-01'), {
      wrapper: wrapperFor(prefs),
    });
    await new Promise(r => setTimeout(r, 20));
    expect(result.current.size).toBe(0);
  }
  expect(read).not.toHaveBeenCalled();
});

it('lists every slot shown in any visible month, once', async () => {
  initServer({
    'envelope-budget-month': async ({ month }: { month: string }) =>
      pocketMonthCells(month, {
        travel: month === '2026-01' ? an2Months['2026-01'] : jpyEur,
      }),
  });
  const { result } = renderHook(() => usePocketSlots(['2026-01', '2026-02']), {
    wrapper: wrapperFor(),
  });
  await waitFor(() =>
    expect(
      result.current.get('travel')?.slots.map(slot => slot.currency),
    ).toEqual(['JPY', 'EUR']),
  );
  expect(result.current.get('travel')!.slots[0]).toEqual({
    id: 'travelJpy',
    currency: 'JPY',
    hidden: false,
  });
});

it('reads again for pocket tables and budget cells, not for others', async () => {
  const read = vi.fn(async ({ month }: { month: string }) =>
    pocketMonthCells(month, { travel: an2Months[month] }),
  );
  initServer({ 'envelope-budget-month': read });
  renderHook(() => usePocketSlots(['2026-01']), { wrapper: wrapperFor() });
  await waitFor(() => expect(read).toHaveBeenCalledTimes(1));
  for (const table of [
    'category_pockets',
    'pocket_budgets',
    'slot_retirements',
    'category_slot_meta',
    'categories',
    'category_mapping',
  ]) {
    const before = read.mock.calls.length;
    serverPush('sync-event', { type: 'applied', tables: [table] });
    await waitFor(() => expect(read).toHaveBeenCalledTimes(before + 1));
  }
  for (const name of [
    'budget202601!budget-travel',
    'budget202601!pocket-value-travelJpy',
    'budget202602!reservation-changes',
  ]) {
    const before = read.mock.calls.length;
    serverPush('cells-changed', [{ name, value: 1 }]);
    await waitFor(() => expect(read).toHaveBeenCalledTimes(before + 1));
  }
  const before = read.mock.calls.length;
  serverPush('cells-changed', [{ name: 'account-balance-a', value: 1 }]);
  serverPush('sync-event', { type: 'applied', tables: ['notes'] });
  await new Promise(r => setTimeout(r, 20));
  expect(read).toHaveBeenCalledTimes(before);
});

// FX-2.2 V9: a rate write alone names only exchange_rates. The server's
// refreshFxChanges then rewrites the revalued month cells, which is what keeps
// pockets current without a reload.
it('V9 reads pockets again from the cells a rate refresh writes', async () => {
  const read = vi.fn(async ({ month }: { month: string }) =>
    pocketMonthCells(month, { travel: an2Months['2026-01'] }),
  );
  initServer({ 'envelope-budget-month': read });
  renderHook(() => usePocketSlots(['2026-02']), { wrapper: wrapperFor() });
  await waitFor(() => expect(read).toHaveBeenCalledTimes(1));
  serverPush('sync-event', { type: 'applied', tables: ['exchange_rates'] });
  await new Promise(r => setTimeout(r, 20));
  expect(read).toHaveBeenCalledTimes(1);
  // V9's literal values from history-valuation.test.ts, in one transaction.
  serverPush('cells-changed', [
    { name: 'budget202602!fx-changes', value: 2000 },
    { name: 'budget202602!pocket-value-travelJpy', value: 4800 },
    { name: 'budget202602!pocket-value-status-travelJpy', value: 'resolved' },
  ]);
  await waitFor(() => expect(read).toHaveBeenCalledTimes(2));
  expect(read).toHaveBeenLastCalledWith({ month: '2026-02' });
});

it('RL6 reads each currency backing from the MC-8.2 details', async () => {
  const details = vi.fn(async () => ({
    ...fxValuationFixture,
    reservations: rl6Reservations,
  }));
  initServer({
    'envelope-budget-month': async ({ month }: { month: string }) =>
      pocketMonthCells(month, { travel: rl6Travel }),
    'budget/fx-valuation': details,
  });
  const { result } = renderHook(() => usePocketBacking('2026-02'), {
    wrapper: wrapperFor(),
  });
  await waitFor(() => expect(result.current.get('JPY')).toBeDefined());
  expect(result.current.get('JPY')).toEqual({
    reserved: 10000,
    held: 0,
    shortage: true,
    precision: 0,
  });
  expect(details).toHaveBeenCalledWith({ month: '2026-02' });
});

it('reads no backing for a month without pockets', async () => {
  const details = vi.fn();
  initServer({
    'envelope-budget-month': async ({ month }: { month: string }) =>
      pocketMonthCells(month, {}),
    'budget/fx-valuation': details,
  });
  renderHook(() => usePocketBacking('2026-02'), { wrapper: wrapperFor() });
  await new Promise(r => setTimeout(r, 20));
  expect(details).not.toHaveBeenCalled();
});

// MC-10.4 inspection 1, F1: the base slot shows when any month resolves it shown.
it('F1 reports base-slot visibility per category across months', async () => {
  const withBase = (shown: boolean) => ({
    ...an2Months['2026-01'],
    baseSlot: { id: 'travel', shown },
  });
  initServer({
    'envelope-budget-month': async ({ month }: { month: string }) =>
      pocketMonthCells(month, {
        travel: withBase(month === '2026-02'),
        food: { ...withBase(false), baseSlot: { id: 'food', shown: false } },
      }),
  });
  const { result } = renderHook(() => usePocketSlots(['2026-01', '2026-02']), {
    wrapper: wrapperFor(),
  });
  await waitFor(() =>
    expect(result.current.get('travel')?.baseShown).toBe(true),
  );
  expect(result.current.get('food')?.baseShown).toBe(false);
});

// MC-10.4 inspection 1, F3: a closed gate hides cached pockets.
describe('F3 cached pockets after the gate closes', () => {
  function setup() {
    initServer({
      'envelope-budget-month': async ({ month }: { month: string }) =>
        pocketMonthCells(month, { travel: rl6Travel }),
      'budget/fx-valuation': async () => ({
        ...fxValuationFixture,
        reservations: rl6Reservations,
      }),
    });
    const store = createTestAppStore();
    store.dispatch(mergeLocalPrefs({ id: 'file-a' }));
    store.dispatch(mergeSyncedPrefs(available));
    const queryClient = createTestQueryClient();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <TestProviders store={store} queryClient={queryClient}>
        {children}
      </TestProviders>
    );
    const read = () =>
      renderHook(
        () => ({
          pockets: useCategoryPockets('2026-02'),
          slots: usePocketSlots(['2026-02']),
          backing: usePocketBacking('2026-02'),
        }),
        { wrapper },
      );
    return { store, read };
  }

  it.each([
    ['tracking', { budgetType: 'tracking' }],
    ['multicurrency off', { 'flags.multicurrency': 'false' }],
  ])(
    'returns nothing once the budget is %s, also after a remount',
    async (_, prefs) => {
      const { store, read } = setup();
      const first = read();
      await waitFor(() => expect(first.result.current.backing.size).toBe(1));
      expect(first.result.current.pockets.size).toBe(1);
      expect(first.result.current.slots.size).toBe(1);

      act(() => {
        store.dispatch(mergeSyncedPrefs(prefs));
      });
      expect(first.result.current.pockets.size).toBe(0);
      expect(first.result.current.slots.size).toBe(0);
      expect(first.result.current.backing.size).toBe(0);
      first.unmount();

      const second = read();
      expect(second.result.current.pockets.size).toBe(0);
      expect(second.result.current.slots.size).toBe(0);
      expect(second.result.current.backing.size).toBe(0);
    },
  );
});
