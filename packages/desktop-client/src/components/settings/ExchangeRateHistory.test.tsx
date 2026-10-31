import type { ReactNode } from 'react';

import { serverPush } from '@actual-app/core/platform/client/connection';
import { act, render, screen, waitFor, within } from '@testing-library/react';
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

const networkCalls = ['exchange-rates/missing-start'];

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
        kind: 'dated',
        date: '2026-02-28',
        existingRate: '0.9',
      },
      {
        line: 4,
        class: 'unchanged',
        quote: 'EUR',
        rate: '0.85',
        kind: 'dated',
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
        kind: 'dated',
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
    await chooseOption('exchange-rate-add-pair', 'Euro');
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
      'Line 2: differs from the saved rate 0.9. EUR 0.92 dated 2026-02-28',
      'Line 4: already saved. EUR 0.85 dated 2026-02-26',
      'Line 6: fetched rates are not imported. EUR 0.91 fetched 2026-02-25',
      'Line 7: invalid rate. EUR 1,05 dated 2026-02-24',
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

describe('missing rates', () => {
  it('starts a manual run from Get missing rates', async () => {
    const { server } = await setup();
    server.on('exchange-rates/missing-start', () => ({ runId: 'run-a' }));
    await userEvent.click(
      screen.getByRole('button', { name: 'Get missing rates' }),
    );
    await waitFor(() =>
      expect(server.sent('exchange-rates/missing-start')).toEqual([
        { reason: 'manual' },
      ]),
    );
  });

  it('shows one status line with Stop for the current context only', async () => {
    const { server } = await setup();
    const status = screen.getByTestId('exchange-rates-update-status');
    // The status read on open has answered before any event arrives.
    await waitFor(() =>
      expect(server.names()).toContain('exchange-rates/missing-status'),
    );
    const update = {
      runId: 'run-a',
      state: 'running' as const,
      added: 0,
      missing: 0,
      errors: 0,
    };
    act(() =>
      serverPush('exchange-rates-update', { ...update, context: contextB }),
    );
    expect(status).toBeEmptyDOMElement();
    act(() =>
      serverPush('exchange-rates-update', { ...update, context: contextA }),
    );
    await waitFor(() =>
      expect(status).toHaveTextContent('Updating exchange rates…'),
    );
    await userEvent.click(within(status).getByRole('button', { name: 'Stop' }));
    await waitFor(() =>
      expect(server.sent('exchange-rates/missing-stop')).toEqual([
        { runId: 'run-a' },
      ]),
    );
    act(() =>
      serverPush('exchange-rates-update', {
        ...update,
        context: contextA,
        state: 'done',
        added: 3,
        missing: 1,
      }),
    );
    await waitFor(() =>
      expect(status).toHaveTextContent(
        'Exchange rates updated: 3 added, 1 not published, 0 failed.',
      ),
    );
    expect(
      within(status).queryByRole('button', { name: 'Stop' }),
    ).not.toBeInTheDocument();
  });
});
