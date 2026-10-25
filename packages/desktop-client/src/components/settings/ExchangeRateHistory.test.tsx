import type { ReactNode } from 'react';

import { serverPush } from '@actual-app/core/platform/client/connection';
import type { BackfillProgress } from '@actual-app/core/types/models/exchange-rate-history';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type * as FxContextModule from '#hooks/useFxProviderContext';
import { createTestQueryClient, TestProviders } from '#mocks';
import {
  chooseOption,
  contextA,
  contextB,
  fxServer,
  fxStore,
} from '#mocks/fxHistory';
import type { Reply } from '#mocks/fxHistory';
import { mergeLocalPrefs } from '#prefs/prefsSlice';

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

const networkCalls = [
  'exchange-rates/provider-status',
  'exchange-rates/backfill-plan',
  'exchange-rates/backfill-start',
];

function preview(
  operation: number,
  context = contextA,
  created = 2,
): Reply<'exchange-rates/import-preview'> {
  return {
    status: 'ok',
    context,
    operation,
    counts: {
      new: created,
      unchanged: 1,
      conflict: 1,
      'duplicate-in-file': 0,
      'conflict-in-file': 0,
      'skipped-fetched': 1,
      invalid: 1,
    },
    ignoredColumns: ['source', 'timestamp'],
    rows: [
      {
        line: 2,
        class: 'conflict',
        quote: 'EUR',
        rate: '0.92',
        kind: 'standing',
        date: '2026-02-28',
        existingRate: '0.9',
      },
      {
        line: 4,
        class: 'unchanged',
        quote: 'EUR',
        rate: '0.85',
        kind: 'standing',
        date: '2026-02-26',
        existingRate: '0.85',
      },
      {
        line: 6,
        class: 'skipped-fetched',
        quote: 'EUR',
        rate: '0.91',
        kind: 'fetched',
        date: '2026-02-25',
      },
      {
        line: 7,
        class: 'invalid',
        error: 'invalid-rate',
        quote: 'EUR',
        rate: '1,05',
        kind: 'standing',
        date: '2026-02-24',
      },
    ],
  };
}

function begun(
  operation: number,
): Reply<'exchange-rates/import-preview-begin'> {
  return { status: 'ok', context: contextA, operation };
}

function plan(
  toFetch: number,
  cached: number,
  context = contextA,
): Reply<'exchange-rates/backfill-plan'> {
  return { status: 'ok', context, dates: toFetch + cached, cached, toFetch };
}

function progress(
  jobId: string,
  overrides: Partial<BackfillProgress> = {},
): BackfillProgress {
  return {
    jobId,
    context: contextA,
    state: 'running',
    total: 7,
    done: 0,
    unprocessed: 7,
    inserted: 0,
    replaced: 0,
    existing: 0,
    cached: 0,
    missing: 0,
    failed: 0,
    ...overrides,
  };
}

async function setup() {
  const server = fxServer();
  const store = fxStore();
  const opened: Array<(paths: string[]) => void> = [];
  const openFileDialog = vi.fn(
    () => new Promise<string[]>(resolve => opened.push(resolve)),
  );
  const saveFile = vi.fn(async () => undefined);
  global.Actual = { ...global.Actual, openFileDialog, saveFile };
  const wrapper = ({ children }: { children: ReactNode }) => (
    <TestProviders store={store} queryClient={createTestQueryClient()}>
      {children}
    </TestProviders>
  );
  const view = render(<ExchangeRateSettings />, { wrapper });
  // The first local page names the current context.
  await screen.findByText('No exchange rates saved yet.');
  async function chooseFile(path: string) {
    const count = openFileDialog.mock.calls.length;
    await userEvent.click(screen.getByRole('button', { name: 'Choose file' }));
    await waitFor(() =>
      expect(openFileDialog).toHaveBeenCalledTimes(count + 1),
    );
    return (paths = [path]) => act(() => opened.shift()?.(paths));
  }
  return { server, store, view, openFileDialog, saveFile, chooseFile };
}

async function fillBackfill(from = '2026-03-09', to = '2026-03-15') {
  await chooseOption('exchange-rate-backfill-quote', 'Euro');
  fireEvent.change(screen.getByLabelText('Backfill from'), {
    target: { value: from },
  });
  fireEvent.change(screen.getByLabelText('Backfill to'), {
    target: { value: to },
  });
}

function startButton() {
  return screen.getByRole('button', { name: 'Start backfill' });
}

function progressRegion() {
  return screen.getByTestId('exchange-rate-backfill-progress');
}

const quiet = () => new Promise(resolve => setTimeout(resolve, 20));

describe('export', () => {
  it('exports the listed filter and saves the server CSV unchanged', async () => {
    const { server, saveFile } = await setup();
    server.on(
      'exchange-rates/history-export',
      () =>
        ({
          status: 'ok',
          context: contextA,
          filename: 'exchange-rates-USD-2026-03-20.csv',
          csv: 'base_currency,quote_currency\nUSD,EUR\n',
          rowCount: 2,
          omittedCount: 1,
        }) satisfies Reply<'exchange-rates/history-export'>,
    );
    await chooseOption('exchange-rate-filter-quote', 'Euro');
    await userEvent.click(screen.getByRole('button', { name: 'Export rates' }));
    await screen.findByText('Rates exported: 2. Invalid rates left out: 1.');
    expect(server.sent('exchange-rates/history-export')).toEqual([
      { quoteCurrency: 'EUR' },
    ]);
    expect(saveFile).toHaveBeenCalledWith(
      'base_currency,quote_currency\nUSD,EUR\n',
      'exchange-rates-USD-2026-03-20.csv',
      'Export exchange rates',
    );
    expect(server.names().filter(name => networkCalls.includes(name))).toEqual(
      [],
    );
  });

  it('keeps an originating budget export from saving into the next budget', async () => {
    const { server, store, saveFile } = await setup();
    server.hold('exchange-rates/history-export');
    await userEvent.click(screen.getByRole('button', { name: 'Export rates' }));
    const oldExport = await server.next('exchange-rates/history-export');
    server.hold('exchange-rates/history-page');
    act(() => {
      void store.dispatch(mergeLocalPrefs({ id: 'file-b' }));
    });
    await server.next('exchange-rates/history-page');
    oldExport({
      status: 'ok',
      context: contextA,
      csv: 'OLD BUDGET DATA',
      filename: 'old.csv',
      rowCount: 1,
      omittedCount: 0,
    } satisfies Reply<'exchange-rates/history-export'>);
    await quiet();
    expect(saveFile).not.toHaveBeenCalled();
    expect(screen.queryByText(/Rates exported/)).toBeNull();
  });

  it('drops an originating export after unmount', async () => {
    const { server, view, saveFile } = await setup();
    server.hold('exchange-rates/history-export');
    await userEvent.click(screen.getByRole('button', { name: 'Export rates' }));
    const oldExport = await server.next('exchange-rates/history-export');
    view.unmount();
    oldExport({
      status: 'ok',
      context: contextA,
      csv: 'CLOSED SECTION DATA',
      filename: 'closed.csv',
      rowCount: 1,
      omittedCount: 0,
    } satisfies Reply<'exchange-rates/history-export'>);
    await quiet();
    expect(saveFile).not.toHaveBeenCalled();
  });
});

describe('import', () => {
  it('reserves an operation only after a file is chosen, previews every class and imports with Keep', async () => {
    const { server, openFileDialog, chooseFile } = await setup();
    server.on('exchange-rates/import-preview-begin', () => begun(1));
    server.on('exchange-rates/import-preview', () => preview(1));
    server.on(
      'exchange-rates/import-commit',
      () =>
        ({
          status: 'ok',
          written: 2,
          replaced: 0,
          kept: 1,
        }) satisfies Reply<'exchange-rates/import-commit'>,
    );
    const select = await chooseFile('/uploads/file.csv');
    expect(openFileDialog).toHaveBeenCalledWith({
      filters: [{ name: 'CSV files', extensions: ['csv'] }],
    });
    expect(server.sent('exchange-rates/import-preview-begin')).toEqual([]);
    select();
    await screen.findByText('New: 2');
    for (const text of [
      'Unchanged: 1',
      'Different from a saved rate: 1',
      'Repeated in the file: 0',
      'Conflicting within the file: 0',
      'Fetched rates skipped: 1',
      'Invalid: 1',
      'Ignored columns: source, timestamp',
      'Line 2: differs from the saved rate 0.9. EUR 0.92 standing 2026-02-28',
      'Line 4: already saved. EUR 0.85 standing 2026-02-26',
      'Line 6: fetched rates are not imported. EUR 0.91 fetched 2026-02-25',
      'Line 7: invalid rate. EUR 1,05 standing 2026-02-24',
    ]) {
      expect(screen.getByText(text)).toBeInTheDocument();
    }
    expect(server.sent('exchange-rates/import-preview')).toEqual([
      { operation: 1, filepath: '/uploads/file.csv' },
    ]);
    await userEvent.click(screen.getByRole('button', { name: 'Import' }));
    await screen.findByText(
      'Rates written: 2. Replaced: 0. Kept unchanged: 1.',
    );
    expect(server.sent('exchange-rates/import-commit')).toEqual([
      { operation: 1, policy: 'keep', context: contextA },
    ]);
    expect(screen.queryByRole('button', { name: 'Import' })).toBeNull();
    // The list shows the imported rows.
    await waitFor(() =>
      expect(server.sent('exchange-rates/history-page')).toHaveLength(2),
    );
    expect(server.names().filter(name => networkCalls.includes(name))).toEqual(
      [],
    );
  });

  it('confirms Replace with the reviewed count and consumes the preview on each attempt', async () => {
    const { server, chooseFile } = await setup();
    server.on('exchange-rates/import-preview-begin', () => begun(1));
    server.on('exchange-rates/import-preview', () => preview(1));
    server.hold('exchange-rates/import-commit');
    (await chooseFile('/uploads/file.csv'))();
    await screen.findByText('New: 2');
    await chooseOption('exchange-rate-import-policy', 'Replace existing');
    await userEvent.click(screen.getByRole('button', { name: 'Import' }));
    expect(
      screen.getByText(
        'Saved rates to replace: 1. Replace them with the rates in this file? You can undo the import.',
      ),
    ).toBeInTheDocument();
    expect(server.sent('exchange-rates/import-commit')).toEqual([]);
    // A policy change closes the confirmation.
    await chooseOption('exchange-rate-import-policy', 'Keep existing');
    expect(
      screen.queryByRole('button', { name: 'Replace and import' }),
    ).toBeNull();
    await chooseOption('exchange-rate-import-policy', 'Replace existing');
    await userEvent.click(screen.getByRole('button', { name: 'Import' }));
    await userEvent.click(
      screen.getByRole('button', { name: 'Replace and import' }),
    );
    // The attempt consumed the preview while it is pending.
    expect(screen.queryByRole('button', { name: 'Import' })).toBeNull();
    (await server.next('exchange-rates/import-commit'))({
      status: 'error',
      code: 'stale-preview',
    });
    await screen.findByText(
      'The saved rates changed after this preview. Choose the file again to review them.',
    );
    expect(screen.queryByRole('button', { name: 'Import' })).toBeNull();
    expect(server.sent('exchange-rates/import-commit')).toEqual([
      { operation: 1, policy: 'replace', context: contextA },
    ]);
  });

  it('asks for a new preview when the server no longer has it', async () => {
    const { server, chooseFile } = await setup();
    server.on('exchange-rates/import-preview-begin', () => begun(1));
    server.on('exchange-rates/import-preview', () => preview(1));
    server.on(
      'exchange-rates/import-commit',
      () =>
        ({
          status: 'error',
          code: 'preview-not-found',
        }) satisfies Reply<'exchange-rates/import-commit'>,
    );
    (await chooseFile('/uploads/file.csv'))();
    await userEvent.click(
      await screen.findByRole('button', { name: 'Import' }),
    );
    await screen.findByText(
      'This preview is no longer available. Choose the file again.',
    );
    expect(screen.queryByRole('button', { name: 'Import' })).toBeNull();
  });

  it('describes a file error with fixed text', async () => {
    const { server, chooseFile } = await setup();
    server.on('exchange-rates/import-preview-begin', () => begun(1));
    server.on(
      'exchange-rates/import-preview',
      () =>
        ({
          status: 'error',
          code: 'missing-column',
          column: 'rate',
        }) satisfies Reply<'exchange-rates/import-preview'>,
    );
    (await chooseFile('/uploads/file.csv'))();
    await screen.findByText('The file has no rate column.');
    expect(screen.queryByRole('button', { name: 'Import' })).toBeNull();
  });

  it('C4 drops an older preview and imports the newer operation', async () => {
    const { server, chooseFile } = await setup();
    let operation = 0;
    server.on('exchange-rates/import-preview-begin', () => begun(++operation));
    server.hold('exchange-rates/import-preview');
    server.on(
      'exchange-rates/import-commit',
      () =>
        ({
          status: 'ok',
          written: 2,
          replaced: 0,
          kept: 1,
        }) satisfies Reply<'exchange-rates/import-commit'>,
    );
    (await chooseFile('/uploads/a.csv'))();
    const first = await server.next('exchange-rates/import-preview');
    (await chooseFile('/uploads/b.csv'))();
    const second = await server.next('exchange-rates/import-preview');
    second(preview(2));
    await screen.findByText('New: 2');
    first(preview(1, contextA, 9));
    await quiet();
    expect(screen.queryByText('New: 9')).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Import' }));
    await waitFor(() =>
      expect(server.sent('exchange-rates/import-commit')).toEqual([
        { operation: 2, policy: 'keep', context: contextA },
      ]),
    );
    expect(server.sent('exchange-rates/import-cancel')).toEqual([
      { operation: 1 },
    ]);
  });

  it('C6 cancels a pending preview and drops its reply', async () => {
    const { server, chooseFile } = await setup();
    server.on('exchange-rates/import-preview-begin', () => begun(1));
    server.hold('exchange-rates/import-preview');
    (await chooseFile('/uploads/a.csv'))();
    const deliver = await server.next('exchange-rates/import-preview');
    await userEvent.click(
      screen.getByRole('button', { name: 'Cancel import' }),
    );
    expect(server.sent('exchange-rates/import-cancel')).toEqual([
      { operation: 1 },
    ]);
    deliver(preview(1));
    await quiet();
    expect(screen.queryByText('New: 2')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Import' })).toBeNull();
    expect(
      screen.queryByRole('button', { name: 'Replace and import' }),
    ).toBeNull();
  });

  it('C7 cancels exactly the operation of a begin reply that arrives after Cancel', async () => {
    const { server, chooseFile } = await setup();
    server.hold('exchange-rates/import-preview-begin');
    (await chooseFile('/uploads/a.csv'))();
    const deliver = await server.next('exchange-rates/import-preview-begin');
    await userEvent.click(
      screen.getByRole('button', { name: 'Cancel import' }),
    );
    deliver(begun(3));
    await waitFor(() =>
      expect(server.sent('exchange-rates/import-cancel')).toEqual([
        { operation: 3 },
      ]),
    );
    expect(server.sent('exchange-rates/import-preview')).toEqual([]);
    expect(screen.queryByText('New: 2')).toBeNull();
  });

  it('C8 keeps the newer operation when an older begin reply arrives late', async () => {
    const { server, chooseFile } = await setup();
    server.hold('exchange-rates/import-preview-begin');
    server.on('exchange-rates/import-preview', () => preview(2));
    (await chooseFile('/uploads/a.csv'))();
    const beginA = await server.next('exchange-rates/import-preview-begin');
    (await chooseFile('/uploads/b.csv'))();
    (await server.next('exchange-rates/import-preview-begin'))(begun(2));
    await screen.findByText('New: 2');
    beginA(begun(1));
    await waitFor(() =>
      expect(server.sent('exchange-rates/import-cancel')).toEqual([
        { operation: 1 },
      ]),
    );
    expect(screen.getByText('New: 2')).toBeInTheDocument();
    expect(server.sent('exchange-rates/import-preview')).toEqual([
      { operation: 2, filepath: '/uploads/b.csv' },
    ]);
    await userEvent.click(
      screen.getByRole('button', { name: 'Cancel import' }),
    );
    expect(server.sent('exchange-rates/import-cancel')).toEqual([
      { operation: 1 },
      { operation: 2 },
    ]);
    expect(screen.queryByText('New: 2')).toBeNull();
  });

  it.each(['budget switch', 'context change', 'unmount'])(
    'C9 never activates a held begin reply after a %s',
    async action => {
      const { server, store, view, chooseFile } = await setup();
      server.hold('exchange-rates/import-preview-begin');
      (await chooseFile('/uploads/a.csv'))();
      const deliver = await server.next('exchange-rates/import-preview-begin');
      act(() => {
        if (action === 'budget switch') {
          store.dispatch(mergeLocalPrefs({ id: 'file-b' }));
        } else if (action === 'context change') {
          serverPush('fx-provider-context', { context: contextB });
        } else {
          view.unmount();
        }
      });
      await quiet();
      deliver(begun(1));
      await waitFor(() =>
        expect(server.sent('exchange-rates/import-cancel')).toEqual([
          { operation: 1 },
        ]),
      );
      expect(server.sent('exchange-rates/import-preview')).toEqual([]);
      expect(screen.queryByText('New: 2')).toBeNull();
    },
  );

  it('C10 never begins after Cancel while the file dialog is open', async () => {
    const { server, chooseFile } = await setup();
    server.on('exchange-rates/import-preview-begin', () => begun(1));
    const select = await chooseFile('/uploads/a.csv');
    await userEvent.click(
      screen.getByRole('button', { name: 'Cancel import' }),
    );
    select();
    await quiet();
    expect(server.sent('exchange-rates/import-preview-begin')).toEqual([]);
    expect(server.sent('exchange-rates/import-preview')).toEqual([]);
  });
});

describe('backfill', () => {
  it('reaches the network only from Check dates and Start', async () => {
    const { server } = await setup();
    server.on('exchange-rates/backfill-plan', () => plan(7, 0));
    server.on(
      'exchange-rates/backfill-start',
      () =>
        ({
          status: 'started',
          jobId: 'job-a',
        }) satisfies Reply<'exchange-rates/backfill-start'>,
    );
    await fillBackfill();
    expect(startButton()).toBeDisabled();
    expect(server.names().filter(name => networkCalls.includes(name))).toEqual(
      [],
    );
    await userEvent.click(screen.getByRole('button', { name: 'Check dates' }));
    await screen.findByText('Dates: 7. Already saved: 0. To fetch: 7.');
    expect(server.sent('exchange-rates/backfill-plan')).toEqual([
      {
        quoteCurrency: 'EUR',
        from: '2026-03-09',
        to: '2026-03-15',
        policy: 'keep',
      },
    ]);
    await userEvent.click(startButton());
    await waitFor(() =>
      expect(server.sent('exchange-rates/backfill-start')).toEqual([
        {
          quoteCurrency: 'EUR',
          from: '2026-03-09',
          to: '2026-03-15',
          policy: 'keep',
          context: contextA,
        },
      ]),
    );
    expect(server.sent('exchange-rates/provider-status')).toEqual([]);
  });

  const planErrors: Array<
    [
      Extract<
        Reply<'exchange-rates/backfill-plan'>,
        { status: 'error' }
      >['code'],
      string,
    ]
  > = [
    [
      'no-server',
      'Backfill needs a sync server. Rates you save or import work without one.',
    ],
    ['no-provider', 'The sync server has no exchange rate provider available.'],
    [
      'not-installed',
      'The exchange rate provider on the sync server is not available.',
    ],
  ];
  it.each(planErrors)(
    'describes %s without asking for setup',
    async (code, text) => {
      const { server } = await setup();
      server.on(
        'exchange-rates/backfill-plan',
        () =>
          ({
            status: 'error',
            code,
          }) satisfies Reply<'exchange-rates/backfill-plan'>,
      );
      await fillBackfill();
      await userEvent.click(
        screen.getByRole('button', { name: 'Check dates' }),
      );
      await screen.findByText(text);
      expect(startButton()).toBeDisabled();
    },
  );

  it('describes an unavailable status read by its code', async () => {
    const { server } = await setup();
    server.on(
      'exchange-rates/backfill-plan',
      () =>
        ({
          status: 'error',
          code: 'status-unavailable',
          statusCode: 'network',
        }) satisfies Reply<'exchange-rates/backfill-plan'>,
    );
    await fillBackfill();
    await userEvent.click(screen.getByRole('button', { name: 'Check dates' }));
    expect(
      await screen.findByText('The sync server could not be reached.'),
    ).toBeInTheDocument();
  });

  it('C2 drops a late Keep summary and confirms with the Replace summary', async () => {
    const { server } = await setup();
    server.hold('exchange-rates/backfill-plan');
    server.on(
      'exchange-rates/backfill-start',
      () =>
        ({
          status: 'started',
          jobId: 'job-a',
        }) satisfies Reply<'exchange-rates/backfill-start'>,
    );
    await fillBackfill();
    await userEvent.click(screen.getByRole('button', { name: 'Check dates' }));
    (await server.next('exchange-rates/backfill-plan'))(plan(5, 2));
    await screen.findByText('Dates: 7. Already saved: 2. To fetch: 5.');
    await userEvent.click(screen.getByRole('button', { name: 'Check dates' }));
    const lateKeep = await server.next('exchange-rates/backfill-plan');
    await chooseOption('exchange-rate-backfill-policy', 'Replace existing');
    expect(
      screen.queryByText('Dates: 7. Already saved: 2. To fetch: 5.'),
    ).toBeNull();
    expect(startButton()).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Check dates' }));
    const replace = await server.next('exchange-rates/backfill-plan');
    expect(startButton()).toBeDisabled();
    replace(plan(7, 0));
    await screen.findByText('Dates: 7. Already saved: 0. To fetch: 7.');
    lateKeep(plan(5, 2));
    await quiet();
    expect(
      screen.queryByText('Dates: 7. Already saved: 2. To fetch: 5.'),
    ).toBeNull();
    await userEvent.click(startButton());
    expect(
      screen.getByText(
        'Dates to fetch: 7. Replace the fetched rates already saved for them? Backfill changes cannot be undone.',
      ),
    ).toBeInTheDocument();
    expect(server.sent('exchange-rates/backfill-start')).toEqual([]);
    await userEvent.click(
      screen.getByRole('button', { name: 'Replace and start' }),
    );
    await waitFor(() =>
      expect(server.sent('exchange-rates/backfill-start')).toEqual([
        {
          quoteCurrency: 'EUR',
          from: '2026-03-09',
          to: '2026-03-15',
          policy: 'replace',
          context: contextA,
        },
      ]),
    );
  });

  it('accepts the first plan that establishes the provider identity', async () => {
    const { server } = await setup();
    server.hold('exchange-rates/backfill-plan');
    server.on(
      'exchange-rates/backfill-start',
      () =>
        ({
          status: 'started',
          jobId: 'job-a',
        }) satisfies Reply<'exchange-rates/backfill-start'>,
    );
    await fillBackfill();
    await userEvent.click(screen.getByRole('button', { name: 'Check dates' }));
    const deliver = await server.next('exchange-rates/backfill-plan');
    // The plan's status read changes the provider generation first.
    act(() => serverPush('fx-provider-context', { context: contextB }));
    await quiet();
    deliver(plan(7, 0, contextB));
    await screen.findByText('Dates: 7. Already saved: 0. To fetch: 7.');
    expect(startButton()).toBeEnabled();
    await userEvent.click(startButton());
    await waitFor(() =>
      expect(server.sent('exchange-rates/backfill-start')).toEqual([
        expect.objectContaining({ context: contextB }),
      ]),
    );
  });

  it('drops a plan computed under a context that has since changed', async () => {
    const { server } = await setup();
    server.hold('exchange-rates/backfill-plan');
    await fillBackfill();
    await userEvent.click(screen.getByRole('button', { name: 'Check dates' }));
    const deliver = await server.next('exchange-rates/backfill-plan');
    act(() => serverPush('fx-provider-context', { context: contextB }));
    await quiet();
    deliver(plan(7, 0, contextA));
    await quiet();
    expect(
      screen.queryByText('Dates: 7. Already saved: 0. To fetch: 7.'),
    ).toBeNull();
    expect(startButton()).toBeDisabled();
  });

  it('drops a held sign-in error after the same budget replaces its provider context', async () => {
    const { server } = await setup();
    server.hold('exchange-rates/backfill-plan');
    await fillBackfill();
    await userEvent.click(screen.getByRole('button', { name: 'Check dates' }));
    const deliver = await server.next('exchange-rates/backfill-plan');
    act(() => serverPush('fx-provider-context', { context: contextB }));
    await quiet();
    deliver({
      status: 'error',
      code: 'status-unavailable',
      statusCode: 'token-expired',
    } satisfies Reply<'exchange-rates/backfill-plan'>);
    await quiet();
    expect(
      screen.queryByText('The sync server sign-in has expired.'),
    ).toBeNull();
    expect(startButton()).toBeDisabled();
  });

  it('drops a held no-provider error after the same budget replaces its provider context', async () => {
    const { server } = await setup();
    server.hold('exchange-rates/backfill-plan');
    await fillBackfill();
    await userEvent.click(screen.getByRole('button', { name: 'Check dates' }));
    const deliver = await server.next('exchange-rates/backfill-plan');
    act(() => serverPush('fx-provider-context', { context: contextB }));
    await quiet();
    deliver({
      status: 'error',
      code: 'no-provider',
    } satisfies Reply<'exchange-rates/backfill-plan'>);
    await quiet();
    expect(
      screen.queryByText(
        'The sync server has no exchange rate provider available.',
      ),
    ).toBeNull();
    expect(startButton()).toBeDisabled();
  });

  it('clears a displayed plan error when the same budget replaces its provider context', async () => {
    const { server } = await setup();
    server.on(
      'exchange-rates/backfill-plan',
      () =>
        ({
          status: 'error',
          code: 'no-provider',
        }) satisfies Reply<'exchange-rates/backfill-plan'>,
    );
    await fillBackfill();
    await userEvent.click(screen.getByRole('button', { name: 'Check dates' }));
    await screen.findByText(
      'The sync server has no exchange rate provider available.',
    );
    act(() => serverPush('fx-provider-context', { context: contextB }));
    await waitFor(() =>
      expect(
        screen.queryByText(
          'The sync server has no exchange rate provider available.',
        ),
      ).toBeNull(),
    );
    expect(startButton()).toBeDisabled();
  });

  it('shows a plan error checked after the provider context has been replaced', async () => {
    const { server } = await setup();
    act(() => serverPush('fx-provider-context', { context: contextB }));
    await quiet();
    server.on(
      'exchange-rates/backfill-plan',
      () =>
        ({
          status: 'error',
          code: 'status-unavailable',
          statusCode: 'token-expired',
        }) satisfies Reply<'exchange-rates/backfill-plan'>,
    );
    await fillBackfill();
    await userEvent.click(screen.getByRole('button', { name: 'Check dates' }));
    expect(
      await screen.findByText('The sync server sign-in has expired.'),
    ).toBeInTheDocument();
    expect(startButton()).toBeDisabled();
  });

  it('shows progress that arrives before the Start reply', async () => {
    const { server } = await setup();
    server.on('exchange-rates/backfill-plan', () => plan(7, 0));
    server.hold('exchange-rates/backfill-start');
    await fillBackfill();
    await userEvent.click(screen.getByRole('button', { name: 'Check dates' }));
    await userEvent.click(
      await screen.findByRole('button', { name: 'Start backfill' }),
    );
    const deliver = await server.next('exchange-rates/backfill-start');
    act(() => serverPush('fx-backfill-progress', progress('job-b')));
    await quiet();
    deliver({ status: 'started', jobId: 'job-b' });
    await waitFor(() =>
      expect(progressRegion()).toHaveTextContent(
        'Backfill running. Processed 0 of 7 dates',
      ),
    );
    expect(progressRegion()).toHaveAttribute('aria-live', 'polite');
    act(() =>
      serverPush(
        'fx-backfill-progress',
        progress('job-b', {
          state: 'done',
          done: 7,
          unprocessed: 0,
          inserted: 5,
          existing: 2,
        }),
      ),
    );
    await waitFor(() =>
      expect(progressRegion()).toHaveTextContent(
        'Backfill finished. Processed 7 of 7 dates: 5 added, 0 replaced, 2 already saved, 0 cached, 0 missing, 0 failed.',
      ),
    );
  });

  it('C3 never shows cancelled job A as job B', async () => {
    const { server } = await setup();
    server.on('exchange-rates/backfill-plan', () => plan(7, 0));
    server.on(
      'exchange-rates/backfill-start',
      () =>
        ({
          status: 'started',
          jobId: 'job-a',
        }) satisfies Reply<'exchange-rates/backfill-start'>,
    );
    await fillBackfill();
    await userEvent.click(screen.getByRole('button', { name: 'Check dates' }));
    await userEvent.click(
      await screen.findByRole('button', { name: 'Start backfill' }),
    );
    act(() =>
      serverPush('fx-backfill-progress', progress('job-a', { done: 1 })),
    );
    await waitFor(() =>
      expect(progressRegion()).toHaveTextContent('Processed 1 of 7'),
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Cancel backfill' }),
    );
    expect(server.sent('exchange-rates/backfill-cancel')).toEqual([
      { jobId: 'job-a' },
    ]);
    const cancelledA = progress('job-a', {
      state: 'stopped',
      stopReason: 'cancelled',
      done: 3,
      unprocessed: 4,
      inserted: 3,
    });
    act(() => serverPush('fx-backfill-progress', cancelledA));
    await waitFor(() =>
      expect(progressRegion()).toHaveTextContent('Backfill cancelled.'),
    );
    server.hold('exchange-rates/backfill-start');
    await userEvent.click(startButton());
    const deliver = await server.next('exchange-rates/backfill-start');
    // A's terminal event repeats while B's Start is pending.
    act(() => serverPush('fx-backfill-progress', cancelledA));
    await quiet();
    deliver({ status: 'started', jobId: 'job-b' });
    act(() => serverPush('fx-backfill-progress', cancelledA));
    await quiet();
    expect(progressRegion()).not.toHaveTextContent('Processed 3 of 7');
    act(() =>
      serverPush('fx-backfill-progress', progress('job-b', { done: 2 })),
    );
    await waitFor(() =>
      expect(progressRegion()).toHaveTextContent('Processed 2 of 7'),
    );
    act(() => serverPush('fx-backfill-progress', cancelledA));
    await quiet();
    expect(progressRegion()).toHaveTextContent('Processed 2 of 7');
    expect(progressRegion()).not.toHaveTextContent('cancelled');
  });

  it('B18 drops progress from before a context change', async () => {
    const { server } = await setup();
    server.on('exchange-rates/backfill-plan', () => plan(7, 0));
    server.on(
      'exchange-rates/backfill-start',
      () =>
        ({
          status: 'started',
          jobId: 'job-a',
        }) satisfies Reply<'exchange-rates/backfill-start'>,
    );
    await fillBackfill();
    await userEvent.click(screen.getByRole('button', { name: 'Check dates' }));
    await userEvent.click(
      await screen.findByRole('button', { name: 'Start backfill' }),
    );
    act(() =>
      serverPush('fx-backfill-progress', progress('job-a', { done: 1 })),
    );
    await waitFor(() =>
      expect(progressRegion()).toHaveTextContent('Processed 1 of 7'),
    );
    act(() => serverPush('fx-provider-context', { context: contextB }));
    await waitFor(() =>
      expect(progressRegion()).not.toHaveTextContent('Processed 1 of 7'),
    );
    act(() =>
      serverPush('fx-backfill-progress', progress('job-a', { done: 4 })),
    );
    await quiet();
    expect(progressRegion()).not.toHaveTextContent('Processed');
    // The summary belonged to the old context too.
    expect(startButton()).toBeDisabled();
  });

  it('keeps an originating budget plan from seeding the next budget', async () => {
    const { server, store } = await setup();
    server.hold('exchange-rates/backfill-plan');
    await fillBackfill();
    await userEvent.click(screen.getByRole('button', { name: 'Check dates' }));
    const oldPlan = await server.next('exchange-rates/backfill-plan');
    server.hold('exchange-rates/history-page');
    act(() => {
      void store.dispatch(mergeLocalPrefs({ id: 'file-b' }));
    });
    await server.next('exchange-rates/history-page');
    expect(startButton()).toBeDisabled();
    oldPlan(plan(7, 0, contextA));
    await quiet();
    expect(
      screen.queryByText('Dates: 7. Already saved: 0. To fetch: 7.'),
    ).toBeNull();
    expect(startButton()).toBeDisabled();
  });

  it('keeps an originating budget plan error off the next budget', async () => {
    const { server, store } = await setup();
    server.hold('exchange-rates/backfill-plan');
    await fillBackfill();
    await userEvent.click(screen.getByRole('button', { name: 'Check dates' }));
    const oldPlan = await server.next('exchange-rates/backfill-plan');
    server.hold('exchange-rates/history-page');
    act(() => {
      void store.dispatch(mergeLocalPrefs({ id: 'file-b' }));
    });
    await server.next('exchange-rates/history-page');
    oldPlan({
      status: 'error',
      code: 'no-provider',
    } satisfies Reply<'exchange-rates/backfill-plan'>);
    await quiet();
    expect(
      screen.queryByText(
        'The sync server has no exchange rate provider available.',
      ),
    ).toBeNull();
    expect(startButton()).toBeDisabled();
  });

  it('drops an originating plan reply after unmount', async () => {
    const { server, view } = await setup();
    server.hold('exchange-rates/backfill-plan');
    await fillBackfill();
    await userEvent.click(screen.getByRole('button', { name: 'Check dates' }));
    const deliver = await server.next('exchange-rates/backfill-plan');
    view.unmount();
    const errors = vi.spyOn(console, 'error');
    try {
      fxObserveLog.length = 0;
      deliver(plan(7, 0, contextA));
      await quiet();
      expect(fxObserveLog).toEqual([]);
      expect(errors).not.toHaveBeenCalled();
    } finally {
      errors.mockRestore();
    }
  });

  async function pressStartAgain() {
    try {
      await userEvent.click(startButton());
    } catch {
      // A disabled Start rejects the click. That is the guarded path.
    }
  }

  it('rejects a second Start while the first is pending when busy is delivered before started', async () => {
    const { server } = await setup();
    server.on('exchange-rates/backfill-plan', () => plan(7, 0));
    server.hold('exchange-rates/backfill-start');
    await fillBackfill();
    await userEvent.click(screen.getByRole('button', { name: 'Check dates' }));
    await screen.findByText('Dates: 7. Already saved: 0. To fetch: 7.');
    await userEvent.click(startButton());
    const first = await server.next('exchange-rates/backfill-start');
    await pressStartAgain();
    if (server.sent('exchange-rates/backfill-start').length > 1) {
      const second = await server.next('exchange-rates/backfill-start');
      second({
        status: 'error',
        code: 'busy',
      } satisfies Reply<'exchange-rates/backfill-start'>);
      first({
        status: 'started',
        jobId: 'real-job',
      } satisfies Reply<'exchange-rates/backfill-start'>);
      act(() =>
        serverPush('fx-backfill-progress', progress('real-job', { done: 2 })),
      );
      await quiet();
      expect(
        screen.getByRole('button', { name: 'Cancel backfill' }),
      ).toBeInTheDocument();
      expect(progressRegion()).toHaveTextContent('Processed 2 of 7');
      return;
    }
    expect(server.sent('exchange-rates/backfill-start')).toHaveLength(1);
    expect(startButton()).toBeDisabled();
    first({
      status: 'started',
      jobId: 'real-job',
    } satisfies Reply<'exchange-rates/backfill-start'>);
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Cancel backfill' }),
      ).toBeInTheDocument(),
    );
    act(() =>
      serverPush('fx-backfill-progress', progress('real-job', { done: 2 })),
    );
    await waitFor(() =>
      expect(progressRegion()).toHaveTextContent('Processed 2 of 7'),
    );
    act(() =>
      serverPush(
        'fx-backfill-progress',
        progress('real-job', {
          state: 'done',
          done: 7,
          unprocessed: 0,
          inserted: 5,
          existing: 2,
        }),
      ),
    );
    await waitFor(() =>
      expect(progressRegion()).toHaveTextContent('Backfill finished.'),
    );
    expect(startButton()).toBeEnabled();
    await userEvent.click(startButton());
    expect(server.sent('exchange-rates/backfill-start')).toHaveLength(2);
  });

  it('rejects a second Start while the first is pending when started is delivered before busy', async () => {
    const { server } = await setup();
    server.on('exchange-rates/backfill-plan', () => plan(7, 0));
    server.hold('exchange-rates/backfill-start');
    await fillBackfill();
    await userEvent.click(screen.getByRole('button', { name: 'Check dates' }));
    await screen.findByText('Dates: 7. Already saved: 0. To fetch: 7.');
    await userEvent.click(startButton());
    const first = await server.next('exchange-rates/backfill-start');
    await pressStartAgain();
    if (server.sent('exchange-rates/backfill-start').length > 1) {
      first({
        status: 'started',
        jobId: 'real-job',
      } satisfies Reply<'exchange-rates/backfill-start'>);
      const second = await server.next('exchange-rates/backfill-start');
      second({
        status: 'error',
        code: 'busy',
      } satisfies Reply<'exchange-rates/backfill-start'>);
      act(() =>
        serverPush('fx-backfill-progress', progress('real-job', { done: 2 })),
      );
      await quiet();
      expect(
        screen.getByRole('button', { name: 'Cancel backfill' }),
      ).toBeInTheDocument();
      expect(progressRegion()).toHaveTextContent('Processed 2 of 7');
      return;
    }
    expect(server.sent('exchange-rates/backfill-start')).toHaveLength(1);
    expect(startButton()).toBeDisabled();
    first({
      status: 'error',
      code: 'busy',
    } satisfies Reply<'exchange-rates/backfill-start'>);
    expect(
      await screen.findByText('A backfill is already running.'),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Cancel backfill' }),
    ).toBeNull();
    expect(startButton()).toBeEnabled();
    await userEvent.click(startButton());
    expect(server.sent('exchange-rates/backfill-start')).toHaveLength(2);
  });

  it('rejects Replace and start while a Start is pending', async () => {
    const { server } = await setup();
    server.on('exchange-rates/backfill-plan', () => plan(7, 0));
    server.hold('exchange-rates/backfill-start');
    await fillBackfill();
    await chooseOption('exchange-rate-backfill-policy', 'Replace existing');
    await userEvent.click(screen.getByRole('button', { name: 'Check dates' }));
    await screen.findByText('Dates: 7. Already saved: 0. To fetch: 7.');
    await userEvent.click(startButton());
    await userEvent.click(
      screen.getByRole('button', { name: 'Replace and start' }),
    );
    const first = await server.next('exchange-rates/backfill-start');
    await pressStartAgain();
    const again = screen.queryByRole('button', { name: 'Replace and start' });
    if (again) {
      try {
        await userEvent.click(again);
      } catch {
        // A disabled confirmation rejects the click.
      }
    }
    expect(server.sent('exchange-rates/backfill-start')).toHaveLength(1);
    expect(startButton()).toBeDisabled();
    first({
      status: 'started',
      jobId: 'real-job',
    } satisfies Reply<'exchange-rates/backfill-start'>);
    expect(
      await screen.findByRole('button', { name: 'Cancel backfill' }),
    ).toBeInTheDocument();
  });
});
