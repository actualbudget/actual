import { HotkeysProvider } from 'react-hotkeys-hook';

import { initServer } from '@actual-app/core/platform/client/connection';
import type { ReservationsBridge } from '@actual-app/core/server/budget/pocket-readers';
import { render, screen, within } from '@testing-library/react';

import {
  createTestAppStore,
  createTestQueryClient,
  TestProviders,
} from '#mocks';
import {
  an1Jpy,
  br1Reservations,
  mm1Reservations,
  ov2Reservations,
  pl1Reservations,
} from '#mocks/fxReservations';
import { fxValuationFixture } from '#mocks/fxValuation';
import { mergeLocalPrefs, mergeSyncedPrefs } from '#prefs/prefsSlice';

import { FxValuationModal } from './FxValuationModal';

vi.mock(
  '@actual-app/core/platform/client/connection',
  () => import('#mocks/connection'),
);
vi.mock('#hooks/useSpreadsheet', () => ({
  useSpreadsheet: () => ({
    bind: (
      sheet: string,
      binding: string | { name: string },
      cb: (node: { name: string; value: number | boolean }) => void,
    ) => {
      const name = typeof binding === 'string' ? binding : binding.name;
      cb({
        name: `${sheet}!${name}`,
        value: name === 'fx-changes' ? 2500 : false,
      });
      return () => undefined;
    },
  }),
}));

const plain = (s: string) => (content: string) =>
  content.replace(/[‪‬]/g, '') === s;

function setup(reservations: ReservationsBridge) {
  initServer({
    'budget/fx-valuation': vi
      .fn()
      .mockResolvedValue({ ...fxValuationFixture, reservations }),
    'get-categories': vi.fn().mockResolvedValue({
      grouped: [],
      list: [{ id: 'travel', name: 'Travel', group: 'group' }],
    }),
  });
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
        <FxValuationModal month="2026-01" />
      </HotkeysProvider>
    </TestProviders>,
  );
}

async function currency(code: string) {
  const heading = await screen.findByRole('heading', {
    name: `${code} reservation`,
  });
  return within(heading.closest('section')!);
}

// MC-10.3 (BR1, BR3): the details explain reserved currencies.
it('BR1 splits the reservation into assigned bases and revaluation', async () => {
  setup(br1Reservations);
  const summary = within(
    await screen.findByRole('region', { name: 'Reserved in other currencies' }),
  );
  expect(summary.getByText(plain('$125.00'))).toBeVisible();
  expect(summary.getByText('Assigned this month')).toBeVisible();
  expect(summary.getByText(plain('$100.00'))).toBeVisible();
  expect(summary.getByText('Spending, resets and revaluation')).toBeVisible();
  expect(summary.getByText(plain('$25.00'))).toBeVisible();
  expect(summary.queryByText(/Pending/)).toBeNull();
  const jpy = await currency('JPY');
  expect(jpy.getByText('Market rate')).toBeVisible();
  expect(jpy.getByText('Pocket total')).toBeVisible();
  expect(
    jpy.getByText(plain('10000 JPY reserved, 10000 JPY held')),
  ).toBeVisible();
  expect(await jpy.findByText('Travel')).toBeVisible();
});

it('shows a pending reservation the next refresh will include', async () => {
  setup({
    ...br1Reservations,
    cell: { changes: 0, incomplete: false },
    pending: true,
  });
  const summary = within(
    await screen.findByRole('region', { name: 'Reserved in other currencies' }),
  );
  const pending = summary.getByText(/Pending: the next refresh will include/);
  expect(pending.textContent!.replace(/[\u202a\u202c]/g, '')).toBe(
    'Pending: the next refresh will include $125.00',
  );
});

it('BR3 PL1 explains planning and account rounding and the funds left', async () => {
  setup(pl1Reservations);
  const jpy = await currency('JPY');
  const row = (label: string) =>
    jpy
      .getByText(label)
      .closest('div')!
      .textContent!.replace(/[‪‬]/g, '');
  expect(row('Planning reconciliation')).toContain('-$20.00');
  expect(row('Account rounding reconciliation')).toContain('$0.00');
  expect(row('Funds from JPY')).toContain('$80.00');
});

it('BR3 RL4 rule 3 shows the included rate and unknown lane values', async () => {
  setup({
    ...br1Reservations,
    currencies: [
      {
        ...an1Jpy,
        rule: 3,
        valuation: 'included-rate',
        incomplete: ['rate-unavailable'],
        lanes: [
          { ...an1Jpy.lanes[0], balanceBase: null, valueKind: 'unknown' },
        ],
      },
    ],
  });
  const jpy = await currency('JPY');
  expect(jpy.getByText('Included holdings rate')).toBeVisible();
  expect(
    jpy.getByText('A rate is unavailable for this currency and date.'),
  ).toBeVisible();
  expect(jpy.getByText('Value unavailable')).toBeVisible();
});

it('BR3 OV2 shows unrepresentable figures as unavailable with reasons', async () => {
  setup(ov2Reservations);
  const summary = within(
    await screen.findByRole('region', { name: 'Reserved in other currencies' }),
  );
  expect(summary.getByText('Reservation incomplete')).toBeVisible();
  const jpy = await currency('JPY');
  expect(jpy.getByText('An amount exceeds supported bounds.')).toBeVisible();
  const row = (label: string) =>
    jpy
      .getByText(label)
      .closest('div')!
      .textContent!.replace(/[\u202a\u202c]/g, '');
  expect(row('Pocket total')).toContain('Unavailable');
  expect(row('Exact change')).toContain('Unavailable');
  expect(row('Written change')).toContain('$0.00');
});

it('BR3 MM1 labels an unknown native, never a market valuation', async () => {
  setup(mm1Reservations);
  const jpy = await currency('JPY');
  expect(jpy.getByText('Unknown native amount')).toBeVisible();
  expect(jpy.queryByText('Market rate')).toBeNull();
  expect(
    jpy.getByText('An assignment is recorded in another currency.'),
  ).toBeVisible();
});
