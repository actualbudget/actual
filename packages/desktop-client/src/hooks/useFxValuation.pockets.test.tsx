import type { ReactNode } from 'react';

import {
  initServer,
  serverPush,
} from '@actual-app/core/platform/client/connection';
import { renderHook, waitFor } from '@testing-library/react';

import {
  createTestAppStore,
  createTestQueryClient,
  TestProviders,
} from '#mocks';
import { br1Reservations } from '#mocks/fxReservations';
import { fxValuationFixture } from '#mocks/fxValuation';
import { mergeLocalPrefs, mergeSyncedPrefs } from '#prefs/prefsSlice';

import { useFxValuation } from './useFxValuation';

vi.mock(
  '@actual-app/core/platform/client/connection',
  () => import('#mocks/connection'),
);

// MC-10.3 (BR2): details refresh on pocket changes while the FX pair holds.
it('BR2 reads again for pocket tables, category renames and reservation cells', async () => {
  const read = vi.fn().mockResolvedValue({
    ...fxValuationFixture,
    reservations: br1Reservations,
  });
  initServer({ 'budget/fx-valuation': read });
  const store = createTestAppStore();
  store.dispatch(mergeLocalPrefs({ id: 'file-a' }));
  store.dispatch(mergeSyncedPrefs({ amountEncoding: 'encoding-a' }));
  const queryClient = createTestQueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <TestProviders store={store} queryClient={queryClient}>
      {children}
    </TestProviders>
  );
  renderHook(() => useFxValuation('2016-12', 6500, false), { wrapper });
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
    'budget201612!reservation-changes',
    'budget201701!reservation-incomplete',
    'budget201612!pocket-value-travelJpy',
  ]) {
    const before = read.mock.calls.length;
    serverPush('cells-changed', [{ name, value: 1 }]);
    await waitFor(() => expect(read).toHaveBeenCalledTimes(before + 1));
  }
  const before = read.mock.calls.length;
  serverPush('cells-changed', [
    { name: 'budget201612!total-income', value: 1 },
  ]);
  serverPush('sync-event', { type: 'applied', tables: ['notes'] });
  await new Promise(r => setTimeout(r, 20));
  expect(read).toHaveBeenCalledTimes(before);
});
