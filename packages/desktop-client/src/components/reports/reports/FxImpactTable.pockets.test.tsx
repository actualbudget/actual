import { HotkeysProvider } from 'react-hotkeys-hook';

import { initServer } from '@actual-app/core/platform/client/connection';
import type { ReservationsBridge } from '@actual-app/core/server/budget/pocket-readers';
import type { FxImpactResult } from '@actual-app/core/types/models';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import {
  createTestAppStore,
  createTestQueryClient,
  TestProviders,
} from '#mocks';
import { fxImpactFixture } from '#mocks/fxImpact';
import { br1Reservations } from '#mocks/fxReservations';
import { mergeLocalPrefs, mergeSyncedPrefs } from '#prefs/prefsSlice';

import { FxImpactTable } from './FxImpactTable';

vi.mock(
  '@actual-app/core/platform/client/connection',
  () => import('#mocks/connection'),
);

const plain = (element: Element | null) =>
  (element?.textContent ?? '').replace(/[‪‬]/g, '');

function renderTable(reservations: ReservationsBridge) {
  initServer({
    'get-categories': vi.fn().mockResolvedValue({
      grouped: [],
      list: [{ id: 'travel', name: 'Travel', group: 'group' }],
    }),
  });
  const result: FxImpactResult = {
    ...fxImpactFixture,
    months: fxImpactFixture.months.map(month => ({
      ...month,
      bridge: month.bridge && { ...month.bridge, reservations },
    })),
  };
  const store = createTestAppStore();
  store.dispatch(mergeLocalPrefs({ id: 'budget-a' }));
  store.dispatch(
    mergeSyncedPrefs({
      defaultCurrencyCode: 'USD',
      amountEncoding: '{"version":1,"currencyCode":"USD","precision":2}',
    }),
  );
  render(
    <TestProviders store={store} queryClient={createTestQueryClient()}>
      <HotkeysProvider>
        <FxImpactTable result={result} />
      </HotkeysProvider>
    </TestProviders>,
  );
  return within(
    screen.getByRole('table', { name: 'FX changes included in To Budget' }),
  );
}

// MC-10.3 (BR1): the bridge shows the reservation To Budget subtracts.
it('BR1 shows the included reservation and its currency details', async () => {
  const user = userEvent.setup();
  const bridge = renderTable(br1Reservations);
  const row = bridge
    .getByRole('rowheader', { name: /Reserved in other currencies/ })
    .closest('tr')!;
  expect(plain(row)).toContain('$125.00');
  expect(plain(row)).toContain('Up to date');
  await user.click(
    bridge.getByRole('button', {
      name: 'Reservations for December 2016',
    }),
  );
  expect(
    await screen.findByRole('heading', { name: 'JPY reservation' }),
  ).toBeVisible();
});

it('BR1 marks the reservation pending until the refresh writes it', () => {
  const bridge = renderTable({
    ...br1Reservations,
    cell: { changes: 0, incomplete: false },
    pending: true,
  });
  const row = bridge
    .getByRole('rowheader', { name: /Reserved in other currencies/ })
    .closest('tr')!;
  // The bridge table signs its amounts.
  expect(plain(row)).toContain(
    'Pending: the next refresh will include +$125.00',
  );
});
