import type { ReactNode } from 'react';

import {
  initServer,
  serverPush,
} from '@actual-app/core/platform/client/connection';
import type { FxImpactResult } from '@actual-app/core/types/models';
import { renderHook, waitFor } from '@testing-library/react';

import {
  createTestAppStore,
  createTestQueryClient,
  TestProviders,
} from '#mocks';
import { fxImpactFixture } from '#mocks/fxImpact';
import { br1Reservations } from '#mocks/fxReservations';
import { mergeLocalPrefs, mergeSyncedPrefs } from '#prefs/prefsSlice';

import { useFxImpact } from './useFxImpact';

vi.mock(
  '@actual-app/core/platform/client/connection',
  () => import('#mocks/connection'),
);

const withReservations: FxImpactResult = {
  ...fxImpactFixture,
  months: fxImpactFixture.months.map(month => ({
    ...month,
    bridge: month.bridge && { ...month.bridge, reservations: br1Reservations },
  })),
};

function setup(result: FxImpactResult) {
  const read = vi.fn().mockResolvedValue(result);
  initServer({ 'report/fx-impact': read });
  const store = createTestAppStore();
  store.dispatch(mergeLocalPrefs({ id: 'budget-a' }));
  store.dispatch(mergeSyncedPrefs({ amountEncoding: 'encoding-a' }));
  const wrapper = ({ children }: { children: ReactNode }) => (
    <TestProviders store={store} queryClient={createTestQueryClient()}>
      {children}
    </TestProviders>
  );
  const view = renderHook(
    () => useFxImpact({ startMonth: '2016-12', endMonth: '2016-12' }),
    { wrapper },
  );
  return { read, view };
}

async function expectRead(read: ReturnType<typeof vi.fn>, push: () => void) {
  const before = read.mock.calls.length;
  push();
  await waitFor(() => expect(read).toHaveBeenCalledTimes(before + 1));
}

// MC-10.3 (BR2): the report reads again when reservations can change.
it('BR2 reads for pocket tables and reservation and lane value cells', async () => {
  const { read, view } = setup(fxImpactFixture);
  await waitFor(() => expect(view.result.current.data).toBeDefined());
  for (const table of [
    'category_pockets',
    'pocket_budgets',
    'slot_retirements',
    'category_slot_meta',
  ]) {
    await expectRead(read, () =>
      serverPush('sync-event', { type: 'applied', tables: [table] }),
    );
  }
  for (const name of [
    'budget201612!reservation-changes',
    'budget201601!reservation-incomplete',
    'budget201612!pocket-value-travelJpy',
  ]) {
    await expectRead(read, () =>
      serverPush('cells-changed', [{ name, value: 1 }]),
    );
  }
});

it('BR2 reads for category renames and mappings once reservations are shown', async () => {
  const { read, view } = setup(withReservations);
  await waitFor(() => expect(view.result.current.data).toBeDefined());
  for (const table of ['categories', 'category_mapping']) {
    await expectRead(read, () =>
      serverPush('sync-event', { type: 'applied', tables: [table] }),
    );
  }
});

// Inspection 1, finding 1: a category change during the initial read is
// not lost, though no result has been committed yet.
it.each(['categories', 'category_mapping'])(
  'reads again after an applied %s change during the initial read',
  async table => {
    let release!: (result: FxImpactResult) => void;
    const read = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<FxImpactResult>(resolve => {
            release = resolve;
          }),
      )
      .mockResolvedValue(withReservations);
    initServer({ 'report/fx-impact': read });
    const store = createTestAppStore();
    store.dispatch(mergeLocalPrefs({ id: 'budget-a' }));
    store.dispatch(mergeSyncedPrefs({ amountEncoding: 'encoding-a' }));
    const wrapper = ({ children }: { children: ReactNode }) => (
      <TestProviders store={store} queryClient={createTestQueryClient()}>
        {children}
      </TestProviders>
    );
    renderHook(
      () => useFxImpact({ startMonth: '2016-12', endMonth: '2016-12' }),
      { wrapper },
    );
    await waitFor(() => expect(read).toHaveBeenCalledTimes(1));
    serverPush('sync-event', { type: 'applied', tables: [table] });
    release(withReservations);
    await waitFor(() => expect(read).toHaveBeenCalledTimes(2));
  },
);
