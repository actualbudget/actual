import { HotkeysProvider } from 'react-hotkeys-hook';
import { MemoryRouter } from 'react-router';

import { initServer } from '@actual-app/core/platform/client/connection';
import type { AccountEntity } from '@actual-app/core/types/models';
import { useMutation } from '@tanstack/react-query';
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { accountQueries } from '#accounts';
import type * as AccountsModule from '#accounts';
import type * as SyncedPrefsModule from '#hooks/useSyncedPrefs';
import {
  createTestAppStore,
  createTestQueryClient,
  TestProviders,
} from '#mocks';
import { mergeSyncedPrefs } from '#prefs/prefsSlice';

import { ImportTransactionsModal } from './ImportTransactionsModal';

vi.mock(
  '@actual-app/core/platform/client/connection',
  () => import('#mocks/connection'),
);

// The import mutations live in a module the test setup loads before this
// file's connection mock applies, so the dialog's two mutations are replaced
// with spies that record exactly what it would send.
const spies = vi.hoisted(() => ({
  preview: vi.fn(),
  importRows: vi.fn(),
  savePrefs: vi.fn(),
}));
// Saved preferences are recorded as the dialog writes them.
vi.mock('#hooks/useSyncedPrefs', async importOriginal => {
  const original = await importOriginal<typeof SyncedPrefsModule>();
  return {
    ...original,
    useSyncedPrefs: () => {
      const [prefs] = original.useSyncedPrefs();
      return [prefs, spies.savePrefs] as const;
    },
  };
});
vi.mock('#accounts', async importOriginal => ({
  ...(await importOriginal<typeof AccountsModule>()),
  useImportPreviewTransactionsMutation: () =>
    useMutation({
      mutationFn: async (payload: unknown) => {
        // A test may make a preview fail or return resolved bases.
        const result = spies.preview(payload);
        if (result instanceof Error) throw result;
        return {
          updatedPreview: [],
          previewBases: [],
          missingRateDates: [],
          missingRates: [],
          ...result,
        };
      },
    }),
  useImportTransactionsMutation: () =>
    useMutation({
      mutationFn: async (payload: unknown) => {
        spies.importRows(payload);
        return true;
      },
    }),
}));

beforeEach(() => {
  spies.preview.mockClear();
  spies.importRows.mockClear();
  spies.savePrefs.mockClear();
});

const yen = {
  id: 'jpy',
  name: 'Yen',
  offbudget: 0,
  currency: 'JPY',
  currency_precision: 0,
} as AccountEntity;
const checking = { id: 'usd', name: 'Checking', offbudget: 0 } as AccountEntity;

const mappings = JSON.stringify({
  date: 'Date',
  amount: 'Amount',
  payee: 'Payee',
  notes: null,
  inOut: null,
  category: null,
  outflow: null,
  inflow: null,
});

const csvRow = (id: string, amount: string, currency: string) => ({
  trx_id: id,
  Date: '2026-03-01',
  Payee: `Shop ${id}`,
  Amount: amount,
  Currency: currency,
});

function setup({
  account = yen,
  rows,
  currencyColumn = 'Currency',
  multicurrency = true,
  fieldMappings = mappings,
  parseDate = 'yyyy mm dd',
}: {
  account?: AccountEntity;
  rows: Array<Record<string, string>>;
  currencyColumn?: string;
  multicurrency?: boolean;
  fieldMappings?: string;
  /** A saved date format; null leaves it to be inferred. */
  parseDate?: string | null;
}) {
  const parseCall = vi.fn(async () => ({ errors: [], transactions: rows }));
  const savePrefsCall = vi.fn(async () => undefined);
  initServer({
    'transactions-parse-file': parseCall,
    'get-categories': async () => ({ grouped: [], list: [] }),
    'payees-get': async () => [],
    'preferences/save': savePrefsCall,
  });
  const store = createTestAppStore();
  store.dispatch(
    mergeSyncedPrefs({
      defaultCurrencyCode: 'USD',
      amountEncoding: JSON.stringify({
        version: 1,
        currencyCode: 'USD',
        precision: 2,
      }),
      'flags.currency': multicurrency ? 'true' : 'false',
      'flags.multicurrency': multicurrency ? 'true' : 'false',
      [`csv-mappings-${account.id}`]: fieldMappings,
      [`csv-currency-column-${account.id}`]: currencyColumn,
      ...(parseDate !== null && {
        [`parse-date-${account.id}-csv`]: parseDate,
      }),
    }),
  );
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(accountQueries.list().queryKey, [yen, checking]);
  render(
    <TestProviders store={store} queryClient={queryClient}>
      <MemoryRouter>
        <HotkeysProvider>
          <ImportTransactionsModal filename="file.csv" accountId={account.id} />
        </HotkeysProvider>
      </MemoryRouter>
    </TestProviders>,
  );
  return { store, parseCall };
}

/** The Import button once the preview shows `count` rows to import. */
async function importButton(count: number) {
  return screen.findByRole('button', {
    name: `Import ${count} transactions`,
  });
}

describe('CSV currency column', () => {
  it('leaves out rows in another currency and imports the rest without the column', async () => {
    const { store } = setup({
      rows: [csvRow('1', '-1500', 'JPY'), csvRow('2', '-12.34', 'EUR')],
    });
    expect(
      await screen.findByText('Rows left out because of their currency:'),
    ).toBeVisible();
    expect(
      screen.getByText(/Currency EUR does not match this account's JPY/),
    ).toBeVisible();
    const button = await importButton(1);
    await userEvent.click(button);
    await waitFor(() => expect(spies.importRows).toHaveBeenCalled());
    const sent = spies.importRows.mock.calls[0][0] as {
      transactions: Array<Record<string, unknown>>;
    };
    expect(sent.transactions).toHaveLength(1);
    expect(sent.transactions[0]).not.toHaveProperty('currency');
    expect(sent.transactions[0]).not.toHaveProperty('Currency');
    expect(sent.transactions[0].payee_name).toBe('Shop 1');
    await waitFor(() =>
      expect(
        store
          .getState()
          .notifications.notifications.some(n =>
            n.message?.includes('Rows left out because of their currency: 1'),
          ),
      ).toBe(true),
    );
  });

  it("compares an inheriting account's rows with the budget currency", async () => {
    setup({
      account: checking,
      rows: [
        csvRow('1', '-15.00', 'usd'),
        csvRow('2', '-12.00', ''),
        csvRow('3', '-9.00', 'EUR'),
      ],
    });
    expect(
      await screen.findByText(/Currency EUR does not match this account's USD/),
    ).toBeVisible();
    expect(await importButton(2)).toBeVisible();
  });

  it('disables Import when every row is left out, keeping the column select', async () => {
    setup({ rows: [csvRow('1', '-12.34', 'EUR')] });
    expect(
      await screen.findByText(/Currency EUR does not match/),
    ).toBeVisible();
    expect(await importButton(0)).toBeDisabled();
    // The column select stays available (its label and the column option).
    expect(screen.getAllByText('Currency').length).toBeGreaterThan(1);
  });

  it('ignores the column without multicurrency', async () => {
    setup({
      rows: [csvRow('1', '-1500', 'JPY'), csvRow('2', '-12', 'EUR')],
      multicurrency: false,
    });
    expect(await importButton(2)).toBeVisible();
    expect(
      screen.queryByText('Rows left out because of their currency:'),
    ).toBeNull();
  });

  it('re-splits when the column is chosen after the first preview, and saves it apart from the field mappings', async () => {
    setup({
      rows: [csvRow('1', '-1500', 'JPY'), csvRow('2', '-12', 'EUR')],
      currencyColumn: '',
    });
    expect(await importButton(2)).toBeVisible();
    await userEvent.click(
      within(screen.getByRole('group', { name: 'Currency column' })).getByRole(
        'button',
      ),
    );
    await userEvent.click(
      await screen.findByRole('button', { name: 'Currency' }),
    );
    expect(
      await screen.findByText(/Currency EUR does not match this account's JPY/),
    ).toBeVisible();
    // Merge off: rows still pass through the same split.
    await userEvent.click(
      screen.getByLabelText('Merge with existing transactions'),
    );
    await userEvent.click(await importButton(1));
    await waitFor(() => expect(spies.importRows).toHaveBeenCalled());
    const sent = spies.importRows.mock.calls[0][0] as {
      transactions: Array<Record<string, unknown>>;
      reconcile: boolean;
    };
    expect(sent.reconcile).toBe(false);
    expect(sent.transactions.map(row => row.payee_name)).toEqual(['Shop 1']);
    // A field mapping that read the currency column is unmapped.
    expect(sent.transactions[0].notes).toBeFalsy();
    const saved = Object.assign(
      {},
      ...spies.savePrefs.mock.calls.map(([prefs]) => prefs),
    ) as Record<string, string>;
    expect(saved['csv-currency-column-jpy']).toBe('Currency');
    expect(saved['csv-mappings-jpy']).not.toContain('currency');
  });

  it('offers a column that only later rows have', async () => {
    const short = {
      trx_id: '1',
      Date: '2026-03-01',
      Payee: 'Shop 1',
      Amount: '-1500',
    } as ReturnType<typeof csvRow>;
    setup({ rows: [short, csvRow('2', '-12', 'EUR')] });
    expect(
      await screen.findByText(/Currency EUR does not match this account's JPY/),
    ).toBeVisible();
    expect(await importButton(1)).toBeEnabled();
  });

  it('keeps Import disabled when the preview for a new column fails', async () => {
    setup({
      rows: [csvRow('1', '-1500', 'JPY'), csvRow('2', '-12', 'EUR')],
      currencyColumn: '',
    });
    expect(await importButton(2)).toBeEnabled();
    spies.preview.mockReturnValueOnce(new Error('preview failed'));
    await userEvent.click(
      within(screen.getByRole('group', { name: 'Currency column' })).getByRole(
        'button',
      ),
    );
    await userEvent.click(
      await screen.findByRole('button', { name: 'Currency' }),
    );
    await waitFor(() => expect(spies.preview).toHaveBeenCalledTimes(2));
    // The list on screen was split without the column: Import waits.
    expect(await importButton(2)).toBeDisabled();
  });

  it('never offers a preview annotation as a column', async () => {
    spies.preview.mockImplementation(
      (payload: { transactions: Array<{ trx_id: string }> }) => ({
        previewBases: payload.transactions.map(transaction => ({
          transaction,
          baseAmount: -1000,
        })),
      }),
    );
    setup({ rows: [csvRow('1', '-1500', 'JPY')] });
    expect(await importButton(1)).toBeVisible();
    await userEvent.click(
      within(screen.getByRole('group', { name: 'Currency column' })).getByRole(
        'button',
      ),
    );
    expect(await screen.findByRole('button', { name: 'Payee' })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'base_amount' })).toBeNull();
    spies.preview.mockReset();
  });
});

describe('CSV currency column (Sol re-review)', () => {
  const sentRows = () =>
    (
      spies.importRows.mock.calls[0][0] as {
        transactions: Array<Record<string, unknown>>;
      }
    ).transactions;

  it("infers the date format from kept rows, not a left-out row's date", async () => {
    setup({
      rows: [
        { ...csvRow('1', '-12.34', 'EUR'), Date: 'invalid' },
        csvRow('2', '-1500', 'JPY'),
      ],
      parseDate: null,
    });
    await userEvent.click(await importButton(1));
    await waitFor(() => expect(spies.importRows).toHaveBeenCalled());
    expect(sentRows()[0].date).toBe('2026-03-01');
  });

  it('keeps a field mapping on the saved column without multicurrency', async () => {
    setup({
      rows: [csvRow('1', '-1500', 'JPY')],
      multicurrency: false,
      fieldMappings: JSON.stringify({
        ...JSON.parse(mappings),
        notes: 'Currency',
      }),
    });
    await userEvent.click(await importButton(1));
    await waitFor(() => expect(spies.importRows).toHaveBeenCalled());
    expect(sentRows()[0].notes).toBe('JPY');
  });

  it('lists a left-out row from before the start date', async () => {
    setup({
      rows: [
        { ...csvRow('1', '-12.34', 'EUR'), Date: '2026-02-01' },
        csvRow('2', '-1500', 'JPY'),
      ],
    });
    await importButton(1);
    fireEvent.change(document.querySelector('#start-date-filter')!, {
      target: { value: '2026-03-01' },
    });
    await waitFor(() =>
      expect(spies.preview.mock.calls.length).toBeGreaterThan(1),
    );
    expect(
      await screen.findByText(/Currency EUR does not match/),
    ).toBeVisible();
  });

  it('shows the filled inflow of a left-out row with separate columns', async () => {
    setup({
      rows: [
        {
          trx_id: '1',
          Date: '2026-03-01',
          Payee: 'Refund',
          Outflow: '',
          Inflow: '12.34',
          Currency: 'EUR',
        },
        {
          trx_id: '2',
          Date: '2026-03-01',
          Payee: 'Shop',
          Outflow: '1500',
          Inflow: '',
          Currency: 'JPY',
        },
      ],
      fieldMappings: JSON.stringify({
        ...JSON.parse(mappings),
        amount: null,
        outflow: 'Outflow',
        inflow: 'Inflow',
      }),
    });
    expect(await screen.findByText(/Inflow 12\.34/)).toBeVisible();
  });
});
