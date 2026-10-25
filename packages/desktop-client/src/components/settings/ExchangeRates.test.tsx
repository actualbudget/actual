import type { ReactNode } from 'react';

import { serverPush } from '@actual-app/core/platform/client/connection';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type * as FxContextModule from '#hooks/useFxProviderContext';
import { createTestQueryClient, TestProviders } from '#mocks';
import {
  chooseOption,
  contextA,
  contextB,
  fxPrefs,
  fxServer,
  fxStore,
  historyRow,
  page,
} from '#mocks/fxHistory';
import type { Reply } from '#mocks/fxHistory';
import { mergeSyncedPrefs } from '#prefs/prefsSlice';

import { ExchangeRateSettings } from './ExchangeRates';

const fxObserveLog: string[] = [];

vi.mock('#hooks/useFxProviderContext', async () => {
  const actual = await vi.importActual<typeof FxContextModule>(
    '#hooks/useFxProviderContext',
  );
  return {
    ...actual,
    useFxProviderContext: () => {
      const value = actual.useFxProviderContext();
      return {
        ...value,
        observe(context: string) {
          fxObserveLog.push(context);
          value.observe(context);
        },
      };
    },
  };
});
vi.mock(
  '@actual-app/core/platform/client/connection',
  () => import('#mocks/connection'),
);
vi.mock('./Currency', () => ({
  useCurrencyOptions: () => [
    ['', 'None'],
    ['USD', 'US Dollar'],
    ['JPY', 'Japanese Yen'],
    ['EUR', 'Euro'],
  ],
}));

const fetchedResolution = {
  status: 'resolved',
  rate: '151',
  kind: 'fetched',
  source: 'plugin:fxtest',
  timestamp: '2026-03-01T00:00:00.000Z',
  fallback: false,
} satisfies Reply<'exchange-rates/resolve'>;
const fetchedRow = historyRow({
  id: 'f1',
  quote_currency: 'EUR',
  rate: '0.91',
  kind: 'fetched',
  source: 'plugin:fxtest',
  timestamp: '2026-02-25T00:00:00.000Z',
});
// Product calls that may reach the sync server.
const networkCalls = [
  'exchange-rates/provider-status',
  'exchange-rates/backfill-plan',
  'exchange-rates/backfill-start',
];

function setup(prefs: Record<string, string> = fxPrefs) {
  const server = fxServer();
  const store = fxStore(prefs);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <TestProviders store={store} queryClient={createTestQueryClient()}>
      {children}
    </TestProviders>
  );
  return { server, store, wrapper };
}

function rowText(text: RegExp) {
  return screen.queryByText(text);
}

describe('ExchangeRateSettings', () => {
  it('gates itself without multicurrency', async () => {
    const { server, wrapper } = setup({
      ...fxPrefs,
      'flags.multicurrency': 'false',
    });
    const { container } = render(<ExchangeRateSettings />, { wrapper });
    await new Promise(resolve => setTimeout(resolve, 20));
    expect(container).toBeEmptyDOMElement();
    expect(server.names()).toEqual([]);
  });

  it('lists the first page from the server without reaching the network', async () => {
    const { server, wrapper } = setup();
    server.on('exchange-rates/history-page', () => page([historyRow()]));
    render(<ExchangeRateSettings />, { wrapper });
    await screen.findByText(/JPY \(Japanese Yen\): 150/);
    expect(server.sent('exchange-rates/history-page')).toEqual([{}]);
    expect(server.names().filter(name => networkCalls.includes(name))).toEqual(
      [],
    );
  });

  it('loads more through an empty page that still has a cursor', async () => {
    const { server, wrapper } = setup();
    server.hold('exchange-rates/history-page');
    render(<ExchangeRateSettings />, { wrapper });
    (await server.next('exchange-rates/history-page'))(
      page([historyRow()], { nextCursor: 'c1', unpageableCount: 2 }),
    );
    await screen.findByText(/JPY \(Japanese Yen\): 150/);
    expect(
      screen.getByText(
        'Saved rates that cannot be listed because their stored values cannot be read: 2.',
      ),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Load more' }));
    (await server.next('exchange-rates/history-page'))(
      page([], { nextCursor: 'c2', invalidCount: 1 }),
    );
    await screen.findByText('Invalid saved rates left out of the list: 1.');
    // Nothing new was shown, but the cursor says more rows exist.
    await userEvent.click(screen.getByRole('button', { name: 'Load more' }));
    (await server.next('exchange-rates/history-page'))(
      page([
        historyRow({
          id: 'r2',
          rate: '140',
          timestamp: '2025-12-01T00:00:00.000Z',
        }),
      ]),
    );
    await screen.findByText(/JPY \(Japanese Yen\): 140/);
    expect(screen.getByText(/JPY \(Japanese Yen\): 150/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Load more' })).toBeNull();
    expect(server.sent('exchange-rates/history-page')).toEqual([
      {},
      { cursor: 'c1' },
      { cursor: 'c2' },
    ]);
  });

  it('C1 drops an earlier filter page that arrives after a filter switch', async () => {
    const { server, wrapper } = setup();
    server.hold('exchange-rates/history-page');
    render(<ExchangeRateSettings />, { wrapper });
    (await server.next('exchange-rates/history-page'))(page([]));
    await chooseOption('exchange-rate-filter-quote', 'Euro');
    (await server.next('exchange-rates/history-page'))(
      page([historyRow({ id: 'e1', quote_currency: 'EUR', rate: '0.92' })], {
        nextCursor: 'e1',
      }),
    );
    await screen.findByText(/EUR \(Euro\): 0.92/);
    await userEvent.click(screen.getByRole('button', { name: 'Load more' }));
    const eurPage2 = await server.next('exchange-rates/history-page');
    await chooseOption('exchange-rate-filter-quote', 'Japanese Yen');
    (await server.next('exchange-rates/history-page'))(
      page([historyRow({ id: 'j1' })], { nextCursor: 'j1' }),
    );
    await screen.findByText(/JPY \(Japanese Yen\): 150/);
    eurPage2(
      page([historyRow({ id: 'e2', quote_currency: 'EUR', rate: '0.93' })], {
        nextCursor: 'e2',
      }),
    );
    await new Promise(resolve => setTimeout(resolve, 20));
    expect(rowText(/EUR \(Euro\)/)).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Load more' }));
    expect(server.sent('exchange-rates/history-page')).toEqual([
      {},
      { quoteCurrency: 'EUR' },
      { quoteCurrency: 'EUR', cursor: 'e1' },
      { quoteCurrency: 'JPY' },
      { quoteCurrency: 'JPY', cursor: 'j1' },
    ]);
  });

  it('C5 drops a page that arrives after unmount', async () => {
    const { server, wrapper } = setup();
    server.hold('exchange-rates/history-page');
    const { unmount } = render(<ExchangeRateSettings />, { wrapper });
    const deliver = await server.next('exchange-rates/history-page');
    unmount();
    const errors = vi.spyOn(console, 'error');
    deliver(page([historyRow()]));
    await new Promise(resolve => setTimeout(resolve, 20));
    expect(errors).not.toHaveBeenCalled();
    expect(server.names()).toEqual(['exchange-rates/history-page']);
  });

  it('drops a Load more page that arrives after the list unmounts', async () => {
    const { server, wrapper } = setup();
    server.hold('exchange-rates/history-page');
    const { unmount } = render(<ExchangeRateSettings />, { wrapper });
    (await server.next('exchange-rates/history-page'))(
      page([historyRow()], { nextCursor: 'c1' }),
    );
    await screen.findByText(/JPY \(Japanese Yen\): 150/);
    await userEvent.click(screen.getByRole('button', { name: 'Load more' }));
    const deliver = await server.next('exchange-rates/history-page');
    unmount();
    const errors = vi.spyOn(console, 'error');
    try {
      fxObserveLog.length = 0;
      deliver(
        page([
          historyRow({
            id: 'r2',
            rate: '140',
            timestamp: '2025-12-01T00:00:00.000Z',
          }),
        ]),
      );
      await new Promise(resolve => setTimeout(resolve, 20));
      expect(fxObserveLog).toEqual([]);
      expect(errors).not.toHaveBeenCalled();
    } finally {
      errors.mockRestore();
    }
  });

  it('removes a fetched row with its reviewed values and explains Keep', async () => {
    const { server, wrapper } = setup();
    server.on('exchange-rates/history-page', () => page([fetchedRow]));
    server.on(
      'exchange-rates/remove-fetched',
      () =>
        ({
          status: 'removed',
        }) satisfies Reply<'exchange-rates/remove-fetched'>,
    );
    render(<ExchangeRateSettings />, { wrapper });
    await screen.findByText(
      /EUR \(Euro\): 0.91 fetched 2026-02-25 \(plugin:fxtest\)/,
    );
    expect(
      screen.getByText(
        'A removed fetched rate stays removed. Only a backfill with Replace existing brings it back; Keep existing does not.',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit' })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Remove' }));
    await waitFor(() =>
      expect(server.sent('exchange-rates/remove-fetched')).toEqual([
        {
          id: 'f1',
          context: contextA,
          reviewed: {
            rate: '0.91',
            source: 'plugin:fxtest',
            timestamp: '2026-02-25T00:00:00.000Z',
          },
        },
      ]),
    );
    // The list reloads after the removal.
    await waitFor(() =>
      expect(server.sent('exchange-rates/history-page')).toHaveLength(2),
    );
    expect(server.sent('exchange-rates/remove')).toEqual([]);
  });

  it('explains a fetched row that changed before removal', async () => {
    const { server, wrapper } = setup();
    server.on('exchange-rates/history-page', () => page([fetchedRow]));
    server.on(
      'exchange-rates/remove-fetched',
      () =>
        ({ status: 'stale' }) satisfies Reply<'exchange-rates/remove-fetched'>,
    );
    render(<ExchangeRateSettings />, { wrapper });
    await userEvent.click(
      await screen.findByRole('button', { name: 'Remove' }),
    );
    expect(
      await screen.findByText(
        'This rate changed after it was listed. Review the list and try again.',
      ),
    ).toBeInTheDocument();
  });

  it('removes a manual row through the manual handler', async () => {
    const { server, wrapper } = setup();
    server.on('exchange-rates/history-page', () => page([historyRow()]));
    server.on(
      'exchange-rates/remove',
      () =>
        ({
          status: 'removed',
          id: 'r1',
        }) satisfies Reply<'exchange-rates/remove'>,
    );
    render(<ExchangeRateSettings />, { wrapper });
    await userEvent.click(
      await screen.findByRole('button', { name: 'Remove' }),
    );
    await waitFor(() =>
      expect(server.sent('exchange-rates/remove')).toEqual([
        { quoteCurrency: 'JPY', kind: 'standing', date: '2026-01-01' },
      ]),
    );
    expect(server.sent('exchange-rates/remove-fetched')).toEqual([]);
    expect(server.names().filter(name => networkCalls.includes(name))).toEqual(
      [],
    );
  });

  it('clears the list on a context change and drops a reply from the old context', async () => {
    const { server, wrapper } = setup();
    server.hold('exchange-rates/history-page');
    render(<ExchangeRateSettings />, { wrapper });
    (await server.next('exchange-rates/history-page'))(
      page([historyRow()], { nextCursor: 'c1' }),
    );
    await screen.findByText(/JPY \(Japanese Yen\): 150/);
    await userEvent.click(screen.getByRole('button', { name: 'Load more' }));
    const oldPage2 = await server.next('exchange-rates/history-page');
    act(() => serverPush('fx-provider-context', { context: contextB }));
    await waitFor(() =>
      expect(rowText(/JPY \(Japanese Yen\): 150/)).toBeNull(),
    );
    const fresh = await server.next('exchange-rates/history-page');
    oldPage2(page([historyRow({ id: 'old', rate: '1' })]));
    // A first page computed under the old context is dropped too.
    fresh(
      page([historyRow({ id: 'stale', rate: '2' })], { context: contextA }),
    );
    await new Promise(resolve => setTimeout(resolve, 20));
    expect(rowText(/JPY \(Japanese Yen\): 1 /)).toBeNull();
    expect(rowText(/JPY \(Japanese Yen\): 2 /)).toBeNull();
  });

  it('names the source of a fetched rate in use', async () => {
    const { server, wrapper } = setup();
    server.on('exchange-rates/history-page', () => page([historyRow()]));
    server.on('exchange-rates/resolve', () => fetchedResolution);
    render(<ExchangeRateSettings />, { wrapper });
    await userEvent.click(await screen.findByRole('button', { name: 'Edit' }));
    expect(
      await screen.findByTestId('exchange-rate-estimate-preview'),
    ).toHaveTextContent('fetched rate 151 from 2026-03-01 (plugin:fxtest)');
  });

  it('locks the form while a save is pending', async () => {
    const { server, wrapper } = setup();
    server.on('exchange-rates/history-page', () => page([historyRow()]));
    server.hold('exchange-rates/save');
    render(<ExchangeRateSettings />, { wrapper });
    await userEvent.click(await screen.findByRole('button', { name: 'Edit' }));
    await userEvent.click(screen.getByRole('button', { name: 'Save rate' }));
    expect(screen.getByRole('button', { name: 'Edit' })).toBeDisabled();
    expect(screen.getByDisplayValue('150')).toBeDisabled();
    (await server.next('exchange-rates/save'))({ status: 'saved', id: 'r1' });
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Edit' })).toBeEnabled(),
    );
    expect(server.names().filter(name => networkCalls.includes(name))).toEqual(
      [],
    );
  });

  it('drops a pending duplicate and the rows when the budget currency changes', async () => {
    const { server, store, wrapper } = setup();
    server.on('exchange-rates/history-page', () => page([historyRow()]));
    server.hold('exchange-rates/save');
    render(<ExchangeRateSettings />, { wrapper });
    await userEvent.click(await screen.findByRole('button', { name: 'Edit' }));
    await userEvent.click(screen.getByRole('button', { name: 'Save rate' }));
    // The EUR rows have not arrived yet.
    server.hold('exchange-rates/history-page');
    act(() => {
      store.dispatch(
        mergeSyncedPrefs({
          defaultCurrencyCode: 'EUR',
          amountEncoding: '{"version":1,"currencyCode":"EUR","precision":2}',
        }),
      );
    });
    expect(rowText(/JPY \(Japanese Yen\): 150/)).toBeNull();
    expect(screen.queryByDisplayValue('150')).toBeNull();
    (await server.next('exchange-rates/save'))({
      status: 'duplicate',
      existing: {
        id: 'r1',
        base_currency: 'USD',
        quote_currency: 'JPY',
        rate: '140',
        kind: 'standing',
        source: 'manual',
        timestamp: '2026-01-01T00:00:00.000Z',
        spec: '{"rate":"140","kind":"standing"}',
        tombstone: 0,
      },
    });
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Save rate' })).toBeEnabled(),
    );
    expect(
      screen.queryByRole('button', { name: 'Replace saved rate' }),
    ).toBeNull();
    expect(server.sent('exchange-rates/save')).toHaveLength(1);
  });
});
