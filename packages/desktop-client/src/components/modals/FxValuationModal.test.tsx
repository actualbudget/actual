import { HotkeysProvider } from 'react-hotkeys-hook';

import { initServer } from '@actual-app/core/platform/client/connection';
import { render, screen, waitFor, within } from '@testing-library/react';

import type { FxValuation } from '#hooks/useFxValuation';
import {
  createTestAppStore,
  createTestQueryClient,
  TestProviders,
} from '#mocks';
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
      if (cellsReady.value) {
        cb({
          name: `${sheet}!${name}`,
          value: name === 'fx-changes' ? 6500 : false,
        });
      }
      return () => undefined;
    },
  }),
}));
const cellsReady = vi.hoisted(() => ({ value: true }));
beforeEach(() => {
  cellsReady.value = true;
});

const plain = (s: string) => (content: string) =>
  content.replace(/[\u202a\u202c]/g, '') === s;
function setup(
  data: FxValuation = fxValuationFixture,
  fail = false,
  prefs: Parameters<typeof mergeSyncedPrefs>[0] = {},
) {
  const read = fail
    ? vi.fn().mockRejectedValue(new Error('boom'))
    : vi.fn().mockResolvedValue(data);
  initServer({ 'budget/fx-valuation': read });
  const store = createTestAppStore();
  store.dispatch(mergeLocalPrefs({ id: 'budget-a' }));
  store.dispatch(
    mergeSyncedPrefs({
      defaultCurrencyCode: 'USD',
      amountEncoding: '{"version":1,"currencyCode":"USD","precision":2}',
      ...prefs,
    }),
  );
  render(
    <TestProviders store={store} queryClient={createTestQueryClient()}>
      <HotkeysProvider>
        <FxValuationModal month="2016-12" />
      </HotkeysProvider>
    </TestProviders>,
  );
  return { read, store };
}
it('shows a literal signed bridge, separate included cell and carry, with provenance at both dates', async () => {
  setup();
  expect(
    await screen.findByRole('heading', { name: 'Yen (JPY)' }),
  ).toBeVisible();
  const totals = within(
    screen.getByRole('region', { name: 'Valuation totals' }),
  );
  expect(totals.getByText(plain('$100.00'))).toBeVisible();
  expect(totals.getByText(plain('$20.00'))).toBeVisible();
  expect(totals.getByText(plain('$60.00'))).toBeVisible();
  expect(totals.getByText(plain('$5.00'))).toBeVisible();
  expect(totals.getByText(plain('$180.00'))).toBeVisible();
  expect(screen.getByText(plain('$65.00'))).toBeVisible();
  expect(screen.getByText('Included in To Budget')).toBeVisible();
  expect(
    screen.getByText('FX valuation details for December 2016'),
  ).toBeVisible();
  expect(screen.getByText('Opening valuation: 11/30/2016')).toBeVisible();
  expect(screen.getByText('Closing valuation: 12/31/2016')).toBeVisible();
  expect(screen.getByText('1 USD = 150 JPY')).toBeVisible();
  expect(screen.getByText('1 USD = 100 JPY')).toBeVisible();
  expect(screen.getByText('Standing rate')).toBeVisible();
  expect(screen.getByText('Fetched rate')).toBeVisible();
  expect(screen.getByText('Source: Manual')).toBeVisible();
  expect(screen.getByText('Source: provider')).toBeVisible();
  expect(
    screen.getByText('Effective timestamp: 12/24/2016 16:05:30 UTC'),
  ).toBeVisible();
  expect(
    screen.getByText('Fallback: latest fetched rate before 12/31/2016'),
  ).toBeVisible();
  expect(screen.getByRole('heading', { name: 'Yen (JPY)' }).textContent).toBe(
    'Yen (JPY)',
  );
  for (const list of document.querySelectorAll('dl')) {
    expect(
      [...list.childNodes].every(node => node.nodeType === Node.ELEMENT_NODE),
    ).toBe(true);
  }
});
it('translates a manual one-day rate and uses the date preference with UTC rate days', async () => {
  setup(
    {
      ...fxValuationFixture,
      accounts: [
        {
          ...fxValuationFixture.accounts[0],
          covers: ['2016-10-31'],
          openingRate: {
            rate: '150',
            kind: 'dated',
            source: 'manual',
            timestamp: '2016-11-30T23:30:00.000Z',
            fallback: false,
          },
        },
      ],
    },
    false,
    { dateFormat: 'dd.MM.yyyy' },
  );
  expect(await screen.findByText('One-day rate')).toBeVisible();
  expect(screen.getByText('Source: Manual')).toBeVisible();
  expect(screen.queryByText(/dated|manual/)).toBeNull();
  expect(screen.getByText('Opening valuation: 30.11.2016')).toBeVisible();
  expect(
    screen.getByText('Effective timestamp: 30.11.2016 23:30:00 UTC'),
  ).toBeVisible();
  expect(screen.getByText('No fallback')).toBeVisible();
  expect(
    screen.getByText('Fallback: latest fetched rate before 31.12.2016'),
  ).toBeVisible();
  expect(
    screen.getByText('Covered unresolved closes: 31.10.2016'),
  ).toBeVisible();
});
it('shows a signed loss without turning it into a gain', async () => {
  setup({
    ...fxValuationFixture,
    posted: -2000,
    closing: 10000,
    broughtForward: 0,
    accounts: [],
  });
  expect(await screen.findByText(plain('-$20.00'))).toBeVisible();
});
it.each([
  'rate-unavailable',
  'precision-unavailable',
  'amount-out-of-range',
] as const)(
  'identifies %s and unavailable amounts without calling them zero',
  async reason => {
    const data = {
      ...fxValuationFixture,
      closing: null,
      incomplete: true,
      unavailableReason: reason,
      accounts: [
        {
          ...fxValuationFixture.accounts[0],
          closing: null,
          rate: null,
          incomplete: true,
          unavailableReason: reason,
        },
      ],
    };
    setup(data);
    expect(await screen.findAllByText('Unavailable')).toHaveLength(2);
    expect(screen.getByText('Valuation incomplete')).toBeVisible();
    expect(
      screen.getByText(
        reason === 'rate-unavailable'
          ? 'A rate is unavailable for this currency and date.'
          : reason === 'precision-unavailable'
            ? 'Recorded currency precision is unavailable.'
            : 'The amount exceeds supported bounds.',
      ),
    ).toBeVisible();
  },
);
it('explains covered unresolved closes and a null opening even when the closing result is complete', async () => {
  setup({
    ...fxValuationFixture,
    opening: null,
    accounts: [
      {
        ...fxValuationFixture.accounts[0],
        opening: null,
        openingRate: null,
        covers: ['2016-10-31', '2016-11-30'],
      },
    ],
  });
  expect(
    await screen.findByText(
      'Covered unresolved closes: 10/31/2016, 11/30/2016',
    ),
  ).toBeVisible();
  expect(screen.getAllByText('Unavailable')).toHaveLength(2);
  expect(screen.getByText('No rate was used.')).toBeVisible();
});
it('shows a known zero holding without pretending a rate was used', async () => {
  setup({
    ...fxValuationFixture,
    accounts: [
      { ...fxValuationFixture.accounts[0], opening: 0, openingRate: null },
    ],
  });
  expect(
    await screen.findByText('Zero holdings; no rate was needed.'),
  ).toBeVisible();
});
it('distinguishes a failed request from a calculated zero and does not retry', async () => {
  const { read } = setup(fxValuationFixture, true);
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Could not load the valuation. Included FX changes remain in To Budget.',
  );
  expect(screen.queryByRole('region', { name: 'Valuation totals' })).toBeNull();
  await waitFor(() => expect(read).toHaveBeenCalledTimes(1));
});

it('waits for included cells without displaying a known zero or requesting the bridge', async () => {
  cellsReady.value = false;
  const { read } = setup();
  expect(screen.queryByText(plain('$0.00'))).toBeNull();
  await waitFor(() =>
    expect(screen.getByText('Loading included FX changes...')).toBeVisible(),
  );
  expect(read).not.toHaveBeenCalled();
});

it('keeps the shared viewport cap so the dialog fits a phone', async () => {
  setup();
  const container = (await screen.findByRole('dialog')).firstElementChild;
  if (!(container instanceof HTMLElement)) throw new Error('no container');
  const style = getComputedStyle(container);
  expect(style.width).toBe('620px');
  // The test DOM may resolve the shared 90vw cap to pixels.
  expect(['90vw', `${window.innerWidth * 0.9}px`]).toContain(style.maxWidth);
});
