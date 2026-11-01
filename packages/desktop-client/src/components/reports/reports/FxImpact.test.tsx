import type { ReactNode } from 'react';
import { HotkeysProvider } from 'react-hotkeys-hook';
import { Link, MemoryRouter, Route, Routes } from 'react-router';

import {
  initServer,
  serverPush,
} from '@actual-app/core/platform/client/connection';
import { MAX_SAFE_NUMBER } from '@actual-app/core/shared/util';
import type {
  AccountEntity,
  FxImpactRequest,
  FxImpactResult,
  FxImpactWidget,
} from '@actual-app/core/types/models';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ReportRouter } from '#components/reports/ReportRouter';
import { buildFxImpactCsv } from '#components/reports/spreadsheets/fx-impact-export';
import {
  createTestAppStore,
  createTestQueryClient,
  TestProviders,
} from '#mocks';
import { fxImpactFixture } from '#mocks/fxImpact';
import { mergeLocalPrefs, mergeSyncedPrefs } from '#prefs/prefsSlice';

import { FxImpact } from './FxImpact';
import { FxImpactCard, sumFxRange } from './FxImpactCard';
import { FxImpactTable } from './FxImpactTable';

vi.mock(
  '@actual-app/core/platform/client/connection',
  () => import('#mocks/connection'),
);

// jsdom has no IntersectionObserver; report cards render once visible.
class VisibleObserver {
  constructor(
    private callback: (
      entries: Array<{ isIntersecting: boolean; target: Element }>,
    ) => void,
  ) {}
  observe(target: Element) {
    this.callback([{ isIntersecting: true, target }]);
  }
  unobserve() {
    // no-op
  }
  disconnect() {
    // no-op
  }
}
beforeEach(() => {
  vi.stubGlobal('IntersectionObserver', VisibleObserver);
});
afterEach(() => {
  vi.unstubAllGlobals();
});

function account(
  fields: Pick<
    AccountEntity,
    'id' | 'name' | 'currency' | 'currency_precision'
  >,
): AccountEntity {
  return {
    offbudget: 0,
    closed: 0,
    sort_order: 0,
    last_reconciled: null,
    tombstone: 0,
    account_group_id: null,
    account_id: null,
    bank: null,
    bankName: null,
    bankId: null,
    mask: null,
    official_name: null,
    balance_current: null,
    balance_available: null,
    balance_limit: null,
    account_sync_source: null,
    last_sync: null,
    bank_sync_status: null,
    ...fields,
  };
}

const available = {
  'flags.currency': 'true',
  'flags.multicurrency': 'true',
  defaultCurrencyCode: 'USD',
  amountEncoding: '{"version":1,"currencyCode":"USD","precision":2}',
};
const plain = (element: Element | null) =>
  (element?.textContent ?? '').replace(/[\u202a\u202c]/g, '');

function providers(prefs: Record<string, string> = available) {
  const store = createTestAppStore();
  store.dispatch(mergeLocalPrefs({ id: 'budget-a' }));
  store.dispatch(mergeSyncedPrefs(prefs));
  return ({ children }: { children: ReactNode }) => (
    <TestProviders store={store} queryClient={createTestQueryClient()}>
      <HotkeysProvider>{children}</HotkeysProvider>
    </TestProviders>
  );
}

function renderTable(
  result: FxImpactResult = fxImpactFixture,
  prefs?: Record<string, string>,
) {
  const Wrapper = providers(prefs);
  render(
    <Wrapper>
      <FxImpactTable result={result} />
    </Wrapper>,
  );
}

/** The cell under a column header in the row headed by `rowName`. */
function cell(table: HTMLElement, rowName: string | RegExp, column: string) {
  const columns = within(table).getAllByRole('columnheader');
  const index = columns.findIndex(c => plain(c).startsWith(column));
  const row = within(table)
    .getAllByRole('rowheader', { name: rowName })[0]
    .closest('tr');
  return row?.children[index] ?? null;
}

describe('FxImpactTable', () => {
  it('is a captioned table grouped by currency then month, with scoped headers', () => {
    renderTable();
    const table = screen.getByRole('table', {
      name: 'FX impact by currency and month',
    });
    expect(
      within(table)
        .getAllByRole('columnheader')
        .map(c => c.getAttribute('scope')),
    ).toEqual(Array(9).fill('col'));
    expect(
      within(table)
        .getAllByRole('columnheader')
        .map(c => plain(c)),
    ).toEqual([
      'Month',
      'Realized (fee FX beneath)',
      'Unrealized change',
      'Transfer carry',
      'Internal settlement',
      'Total change',
      'Fee expense',
      'Closing unrealized',
      'Closing rate',
    ]);
    const groups = within(table)
      .getAllByRole('rowgroup')
      .map(group => group.querySelector('th[scope="rowgroup"]'))
      .filter(Boolean)
      .map(plain);
    expect(groups).toEqual(['JPY', 'KWD', 'Selected total']);
  });

  it('shows signs as text and keeps known zero apart from unavailable values with reasons and dates', () => {
    renderTable();
    const table = screen.getByRole('table', {
      name: 'FX impact by currency and month',
    });
    const [jpy, kwd] = within(table).getAllByRole('rowheader', {
      name: /December 2016/,
    });
    const jpyRow = jpy.closest('tr')!;
    const kwdRow = kwd.closest('tr')!;
    expect(plain(jpyRow.children[1])).toBe('$0.00Fee FX $0.00');
    expect(plain(jpyRow.children[2])).toBe('+$25.00');
    expect(plain(jpyRow.children[5])).toBe('+$25.00');
    expect(plain(kwdRow.children[1])).toBe('UnavailableFee FX Unavailable');
    expect(plain(kwdRow.children[2])).toBe('Unavailable');
    expect(plain(kwd)).toContain('Incomplete: Dinar');
    const total = within(table).getByRole('rowheader', {
      name: /December 2016.*Fees in USD/,
    });
    expect(plain(total.closest('tr')!.children[6])).toBe('-$2.00');
  });

  it('expands account details from the keyboard with rate provenance and reasons', async () => {
    const user = userEvent.setup();
    renderTable();
    const jpyToggle = screen.getByRole('button', {
      name: 'Accounts in JPY for December 2016',
    });
    expect(jpyToggle).toHaveAttribute('aria-expanded', 'false');
    expect(
      screen.queryByRole('rowheader', { name: /=Yen/ }),
    ).not.toBeInTheDocument();
    jpyToggle.focus();
    await user.keyboard('{Enter}');
    expect(jpyToggle).toHaveAttribute('aria-expanded', 'true');
    const yen = screen.getByRole('rowheader', { name: /=Yen/ });
    const rate = plain(yen.closest('tr')!.lastElementChild);
    expect(rate).toContain('1 USD = 80 JPY');
    expect(rate).toContain('Standing rate');
    expect(rate).toContain('Source: Manual');
    expect(rate).toContain('Effective 12/01/2016 00:00:00 UTC');
    expect(rate).toContain('No fallback');
    expect(rate).toContain('12/31/2016');

    await user.click(
      screen.getByRole('button', { name: 'Accounts in KWD for December 2016' }),
    );
    const dinar = screen.getByRole('rowheader', { name: /^Dinar/ });
    expect(plain(dinar)).toContain('Sign mismatch since 12/05/2016');
    expect(plain(dinar)).toContain('Rate unavailable since 12/31/2016');
    expect(plain(dinar.closest('tr')!.children[1])).toBe(
      'UnavailableFee FX Unavailable',
    );
    await user.keyboard('{Enter}');
    jpyToggle.focus();
    await user.keyboard(' ');
    expect(jpyToggle).toHaveAttribute('aria-expanded', 'false');
  });

  it('keeps whole-exchange reference figures in their own labelled table', async () => {
    const user = userEvent.setup();
    renderTable();
    const exchanges = screen.getByRole('table', {
      name: 'Reference figures for whole exchanges; do not add to FX totals',
    });
    const month = within(exchanges).getByRole('rowheader', {
      name: /December 2016/,
    });
    expect(plain(month.closest('tr'))).toContain('-$2.00');
    expect(plain(month.closest('tr'))).toContain('+$25.00');
    await user.click(
      within(exchanges).getByRole('button', {
        name: 'Exchanges for December 2016',
      }),
    );
    const row = within(exchanges)
      .getByRole('rowheader', { name: /12\/10\/2016/ })
      .closest('tr');
    expect(plain(row)).toContain('Cash');
    expect(plain(row)).toContain('-$100.00');
    expect(plain(row)).toContain('No FX in the budget currency');
    expect(plain(row)).toContain('=Yen');
    expect(plain(row)).toContain('¥10,000');
    expect(plain(row)).toContain('1 USD = 100 JPY');
    expect(plain(row)).toContain('Fetched rate');
    expect(plain(row)).toContain('Fallback: latest fetched rate before');
  });

  it('explains an unknown exchange spread at the endpoint that lacks its rate', async () => {
    const user = userEvent.setup();
    const month = fxImpactFixture.months[0];
    const [exchange] = month.exchanges;
    renderTable({
      ...fxImpactFixture,
      months: [
        {
          ...month,
          exchanges: [
            {
              ...exchange,
              spread: null,
              destination: {
                ...exchange.destination,
                referenceRate: null,
                reasons: [{ reason: 'rate-unavailable', since: '2016-12-10' }],
              },
            },
          ],
        },
      ],
    });
    const exchanges = screen.getByRole('table', {
      name: 'Reference figures for whole exchanges; do not add to FX totals',
    });
    await user.click(
      within(exchanges).getByRole('button', {
        name: 'Exchanges for December 2016',
      }),
    );
    const row = within(exchanges)
      .getByRole('rowheader', { name: /12\/10\/2016/ })
      .closest('tr');
    expect(plain(row?.children[2] ?? null)).toContain(
      'Rate unavailable since 12/10/2016',
    );
    expect(plain(row?.children[1] ?? null)).not.toContain('Rate unavailable');
    expect(plain(row?.children[5] ?? null)).toContain('Unavailable');
  });

  it('shows the included cell, a pending next contribution and covered closes in the bridge', async () => {
    const user = userEvent.setup();
    renderTable();
    const bridge = screen.getByRole('table', {
      name: 'FX changes included in To Budget',
    });
    const row = within(bridge)
      .getByRole('rowheader', { name: /December 2016/ })
      .closest('tr')!;
    expect(plain(row.children[1])).toBe('$0.00');
    expect(plain(row)).toContain(
      'Pending: the next refresh will include +$25.00',
    );
    await user.click(
      within(bridge).getByRole('button', {
        name: 'Bridge accounts for December 2016',
      }),
    );
    const yen = within(bridge)
      .getByRole('rowheader', { name: /=Yen/ })
      .closest('tr');
    expect(plain(yen)).toContain('+$25.00');
    expect(plain(yen)).toContain('Covers 11/30/2016');
  });

  it('notes that a tracking budget includes no FX changes', () => {
    const [month] = fxImpactFixture.months;
    renderTable({
      ...fxImpactFixture,
      months: [
        {
          ...month,
          bridge: {
            ...month.bridge,
            budgetType: 'tracking',
            cell: null,
            pending: false,
          },
        },
      ],
    });
    const bridge = screen.getByRole('table', {
      name: 'FX changes included in To Budget',
    });
    expect(plain(bridge)).toContain(
      'Tracking budgets do not include FX changes.',
    );
    expect(plain(bridge)).not.toContain('Pending');
  });

  it('filters amounts in privacy mode', () => {
    renderTable(fxImpactFixture, { ...available, isPrivacyEnabled: 'true' });
    const table = screen.getByRole('table', {
      name: 'FX impact by currency and month',
    });
    expect(plain(cell(table, /December 2016/, 'Unrealized change'))).toContain(
      '**25*00',
    );
  });
});

describe('sumFxRange', () => {
  const month = fxImpactFixture.months[0];
  const months = [
    month,
    { ...month, total: { ...month.total, settlement: 7 } },
  ];

  it('sums a field across the range and keeps unknown as null', () => {
    expect(sumFxRange(months, 'unrealized')).toBe(null);
    expect(
      sumFxRange(
        [
          { ...month, total: { ...month.total, unrealized: 2500 } },
          { ...month, total: { ...month.total, unrealized: -100 } },
        ],
        'unrealized',
      ),
    ).toBe(2400);
    expect(sumFxRange([], 'settlement')).toBe(0);
  });

  it('returns null rather than an unrepresentable sum', () => {
    const big = {
      ...month,
      total: { ...month.total, feeExpense: MAX_SAFE_NUMBER },
    };
    expect(sumFxRange([big, big], 'feeExpense')).toBe(null);
  });
});

type Selection = Omit<FxImpactRequest, 'accountIds' | 'currencies'>;
function cardSetup(
  prefs: Record<string, string> = available,
  meta: FxImpactWidget['meta'] = {
    timeFrame: { start: '2016-12', end: '2016-12', mode: 'static' },
  },
) {
  const read = vi.fn().mockResolvedValue(fxImpactFixture);
  initServer({ 'report/fx-impact': read });
  const onMetaChange = vi.fn();
  const Wrapper = providers(prefs);
  render(
    <Wrapper>
      <MemoryRouter>
        <Routes>
          <Route
            path="/"
            element={
              <FxImpactCard
                widgetId="w1"
                meta={meta}
                onMetaChange={onMetaChange}
              />
            }
          />
          <Route path="/reports/fx-impact/:id" element={<p>Detail</p>} />
        </Routes>
      </MemoryRouter>
    </Wrapper>,
  );
  return { read, onMetaChange };
}

describe('FxImpactCard', () => {
  it('shows selected realized, unrealized change and settlement for the range with an incomplete marker', async () => {
    const { read } = cardSetup();
    expect(await screen.findByText('Incomplete')).toBeVisible();
    expect(read).toHaveBeenCalledWith({
      startMonth: '2016-12',
      endMonth: '2016-12',
      accountIds: null,
      currencies: null,
    } satisfies Selection & Pick<FxImpactRequest, 'accountIds' | 'currencies'>);
    const realized = screen.getByText('Realized').closest('div')!;
    expect(plain(realized.parentElement)).toContain('Unavailable');
    await userEvent.click(screen.getByText('Realized'));
    expect(await screen.findByText('Detail')).toBeVisible();
  });

  it('keeps reporting a failed background read beside the retained figures', async () => {
    const { read } = cardSetup();
    expect(await screen.findByText('Incomplete')).toBeVisible();
    read.mockRejectedValue(new Error('boom'));
    serverPush('sync-event', { type: 'applied', tables: ['transactions'] });
    expect(
      await screen.findByText(
        'Could not refresh. These figures are from the last successful read.',
      ),
    ).toBeVisible();
    expect(screen.getByText('Realized')).toBeVisible();
  });

  it('keeps its configuration and sends no request while multicurrency is unavailable', async () => {
    const { read, onMetaChange } = cardSetup({
      ...available,
      'flags.multicurrency': 'false',
    });
    expect(
      await screen.findByText(
        'The FX impact report needs multicurrency, which is turned off for this budget.',
      ),
    ).toBeVisible();
    await act(() => new Promise(r => setTimeout(r, 20)));
    expect(read).not.toHaveBeenCalled();
    expect(onMetaChange).not.toHaveBeenCalled();
  });
});

describe('FxImpact report', () => {
  const widget = {
    id: 'w1',
    type: 'fx-impact-card' as const,
    x: 0,
    y: 0,
    width: 4,
    height: 2,
    dashboard_page_id: 'p1',
    tombstone: false,
    meta: {
      name: 'Yen view',
      timeFrame: { start: '2016-11', end: '2016-12', mode: 'static' as const },
      accounts: ['yen'],
      currencies: ['JPY'],
    },
  } satisfies FxImpactWidget;

  function setup(
    read = vi.fn().mockResolvedValue(fxImpactFixture),
    meta: FxImpactWidget['meta'] = widget.meta,
  ) {
    const update = vi.fn().mockResolvedValue(undefined);
    initServer({
      'report/fx-impact': read,
      'dashboard-update-widget': update,
      query: async () => ({
        data: [
          { ...widget, meta },
          {
            ...widget,
            id: 'w2',
            meta: {
              timeFrame: {
                start: '2016-12',
                end: '2016-12',
                mode: 'static' as const,
              },
              accounts: ['cash'],
            },
          },
        ],
        dependencies: [],
      }),
      'accounts-get': async () => [
        account({
          id: 'yen',
          name: '=Yen',
          currency: 'JPY',
          currency_precision: 0,
        }),
        account({
          id: 'cash',
          name: 'Cash',
          currency: null,
          currency_precision: null,
        }),
      ],
      'get-earliest-transaction': async () => null,
      'get-latest-transaction': async () => null,
    });
    const saveFile = vi.fn();
    global.Actual = { ...global.Actual, saveFile };
    const Wrapper = providers();
    render(
      <Wrapper>
        <MemoryRouter initialEntries={['/fx-impact/w1']}>
          <Routes>
            <Route
              path="/fx-impact/:id"
              element={
                <>
                  <Link to="/fx-impact/w2">Other widget</Link>
                  <FxImpact />
                </>
              }
            />
          </Routes>
        </MemoryRouter>
      </Wrapper>,
    );
    return { read, update, saveFile };
  }

  it('reads the saved selections and saves them back', async () => {
    const user = userEvent.setup();
    const { read, update } = setup();
    await waitFor(() =>
      expect(read).toHaveBeenCalledWith({
        startMonth: '2016-11',
        endMonth: '2016-12',
        accountIds: ['yen'],
        currencies: ['JPY'],
      }),
    );
    await user.click(
      await screen.findByRole('button', { name: 'Save widget' }),
    );
    await waitFor(() =>
      expect(update).toHaveBeenCalledWith({
        id: 'w1',
        meta: {
          name: 'Yen view',
          timeFrame: { start: '2016-11', end: '2016-12', mode: 'static' },
          accounts: ['yen'],
          currencies: ['JPY'],
        },
      }),
    );
  });

  it('saves the month start and day end that Live to Static keeps for prior year to date', async () => {
    const user = userEvent.setup();
    // Tests run on 2017-01-01. The Prior year to date preset saves month
    // bounds and its mode.
    const { read, update } = setup(undefined, {
      ...widget.meta,
      timeFrame: { start: '2016-01', end: '2016-01', mode: 'priorYearToDate' },
    });
    await waitFor(() =>
      expect(read).toHaveBeenCalledWith({
        startMonth: '2016-01',
        endMonth: '2016-01',
        accountIds: ['yen'],
        currencies: ['JPY'],
      }),
    );
    await user.click(screen.getByRole('button', { name: 'Live' }));
    await user.click(screen.getByRole('button', { name: 'Save widget' }));
    // The dashboard importer accepts exactly this shape (dashboard/app.test.ts).
    await waitFor(() =>
      expect(update).toHaveBeenCalledWith({
        id: 'w1',
        meta: {
          ...widget.meta,
          timeFrame: { start: '2016-01', end: '2016-01-01', mode: 'static' },
        },
      }),
    );
  });

  it('loads the saved selections of another widget opened in place', async () => {
    const user = userEvent.setup();
    const { read } = setup();
    await waitFor(() => expect(read).toHaveBeenCalledTimes(1));
    await user.click(screen.getByRole('link', { name: 'Other widget' }));
    await waitFor(() =>
      expect(read).toHaveBeenLastCalledWith({
        startMonth: '2016-12',
        endMonth: '2016-12',
        accountIds: ['cash'],
        currencies: null,
      }),
    );
  });

  it('exports the displayed result, keeping it during a background read', async () => {
    const user = userEvent.setup();
    const releases: Array<(result: FxImpactResult) => void> = [];
    const read = vi
      .fn()
      .mockResolvedValueOnce(fxImpactFixture)
      .mockImplementation(
        () =>
          new Promise<FxImpactResult>(resolve => {
            releases.push(resolve);
          }),
      );
    const { saveFile } = setup(read);
    const exportButton = await screen.findByRole('button', {
      name: 'Export as CSV',
    });
    await waitFor(() => expect(exportButton).toBeEnabled());
    serverPush('sync-event', { type: 'applied', tables: ['transactions'] });
    await waitFor(() => expect(releases).toHaveLength(1));
    await user.click(exportButton);
    expect(saveFile).toHaveBeenLastCalledWith(
      buildFxImpactCsv(fxImpactFixture),
      'yen-view-2016-11-2016-12.csv',
      'Export FX impact',
    );
    // The newer read changes an exported amount: the budget-currency fee line.
    const [month] = fxImpactFixture.months;
    const newer = {
      ...fxImpactFixture,
      months: [{ ...month, budgetCurrencyFeeExpense: -300 }],
    };
    await act(async () => releases[0](newer));
    await user.click(exportButton);
    expect(saveFile).toHaveBeenLastCalledWith(
      buildFxImpactCsv(newer),
      'yen-view-2016-11-2016-12.csv',
      'Export FX impact',
    );
    const [before, after] = saveFile.mock.calls.map(([csv]) => csv);
    expect(before).not.toEqual(after);
    expect(before).toContain('budget-currency-fees,2016-12,USD,');
    expect(before).toMatch(/\nbudget-currency-fees,[^\n]*,-2\.00,/);
    expect(after).toMatch(/\nbudget-currency-fees,[^\n]*,-3\.00,/);
  });

  it('disables export across a changed request until its result displays', async () => {
    const user = userEvent.setup();
    const releases: Array<(result: FxImpactResult) => void> = [];
    const read = vi
      .fn()
      .mockResolvedValueOnce(fxImpactFixture)
      .mockImplementation(
        () =>
          new Promise<FxImpactResult>(resolve => {
            releases.push(resolve);
          }),
      );
    const { saveFile } = setup(read);
    const exportButton = await screen.findByRole('button', {
      name: 'Export as CSV',
    });
    await waitFor(() => expect(exportButton).toBeEnabled());
    await user.click(screen.getByRole('button', { name: 'Currencies' }));
    await user.click(await screen.findByText('All currencies'));
    // The picker stays open for more choices; close it as a user would.
    await user.keyboard('{Escape}');
    await waitFor(() =>
      expect(read).toHaveBeenLastCalledWith({
        startMonth: '2016-11',
        endMonth: '2016-12',
        accountIds: ['yen'],
        currencies: null,
      }),
    );
    expect(exportButton).toBeDisabled();
    expect(
      screen.queryByRole('table', { name: 'FX impact by currency and month' }),
    ).not.toBeInTheDocument();
    const [month] = fxImpactFixture.months;
    const changed = {
      ...fxImpactFixture,
      months: [{ ...month, budgetCurrencyFeeExpense: -300 }],
    };
    await act(async () => releases[0](changed));
    await waitFor(() => expect(exportButton).toBeEnabled());
    await user.click(exportButton);
    expect(saveFile).toHaveBeenCalledTimes(1);
    expect(saveFile).toHaveBeenLastCalledWith(
      buildFxImpactCsv(changed),
      'yen-view-2016-11-2016-12.csv',
      'Export FX impact',
    );
  });

  it('sends no read for a range over 120 months', async () => {
    const read = vi.fn().mockResolvedValue(fxImpactFixture);
    setup(read, {
      timeFrame: { start: '2006-12', end: '2016-12', mode: 'static' },
    });
    expect(
      await screen.findByText('Choose a range of 120 months or fewer.'),
    ).toBeVisible();
    expect(read).not.toHaveBeenCalled();
    expect(
      screen.getByRole('button', { name: 'Export as CSV' }),
    ).toBeDisabled();
  });
});

describe('report routes', () => {
  function renderRoute(prefs: Record<string, string>) {
    const read = vi.fn().mockResolvedValue(fxImpactFixture);
    initServer({
      'report/fx-impact': read,
      query: async () => ({ data: [], dependencies: [] }),
      'accounts-get': async () => [],
      'get-earliest-transaction': async () => null,
      'get-latest-transaction': async () => null,
    });
    const Wrapper = providers(prefs);
    render(
      <Wrapper>
        <MemoryRouter initialEntries={['/fx-impact']}>
          <ReportRouter />
        </MemoryRouter>
      </Wrapper>,
    );
    return read;
  }

  it('serves the report only while multicurrency is available', async () => {
    const off = renderRoute({ ...available, 'flags.currency': 'false' });
    await act(() => new Promise(r => setTimeout(r, 50)));
    expect(off).not.toHaveBeenCalled();
    expect(
      screen.queryByRole('table', { name: 'FX impact by currency and month' }),
    ).not.toBeInTheDocument();
  });

  it('reads the report when available', async () => {
    const on = renderRoute(available);
    await waitFor(() => expect(on).toHaveBeenCalled());
  });
});
