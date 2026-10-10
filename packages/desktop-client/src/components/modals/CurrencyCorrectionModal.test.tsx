import { HotkeysProvider } from 'react-hotkeys-hook';
import { MemoryRouter } from 'react-router';

import { initServer } from '@actual-app/core/platform/client/connection';
import type { AccountEntity } from '@actual-app/core/types/models';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { accountQueries } from '#accounts';
import { StaleEncodingWarning } from '#components/accounts/StaleEncodingWarning';
import {
  createTestAppStore,
  createTestQueryClient,
  TestProviders,
} from '#mocks';
import { pushModal } from '#modals/modalsSlice';
import { mergeSyncedPrefs } from '#prefs/prefsSlice';
import { aqlQuery } from '#queries/aqlQuery';

import { CurrencyCorrectionModal } from './CurrencyCorrectionModal';
import { StaleEncodingRepairModal } from './StaleEncodingRepairModal';

vi.mock(
  '@actual-app/core/platform/client/connection',
  () => import('#mocks/connection'),
);
vi.mock('#queries/aqlQuery', () => ({ aqlQuery: vi.fn() }));

const yen = {
  id: 'jpy',
  name: 'Yen',
  offbudget: 0,
  closed: 0,
  currency: 'JPY',
  currency_precision: 0,
} as AccountEntity;
const savings = { id: 'kwd', name: 'Savings', offbudget: 0 } as AccountEntity;

type Row = {
  id: string;
  date: string;
  isParent: boolean;
  tombstone: boolean;
  before: { amount: number; transaction_amount: number | null };
  after: { amount: number; transaction_amount: number | null } | null;
  rate: string | null;
  roundingLoss: boolean;
  external?: true;
  account?: string;
  scheduleUnlinked?: true;
  error?: string;
};
const row = (id: string, fields: Partial<Row> = {}): Row => ({
  id,
  date: '2026-03-10',
  isParent: false,
  tombstone: false,
  before: { amount: -1000, transaction_amount: -1500 },
  after: { amount: -1000, transaction_amount: -1000 },
  rate: '1',
  roundingLoss: false,
  ...fields,
});
const preview = (fields: Record<string, unknown> = {}) => ({
  rows: [row('a')],
  schedules: [],
  missingRates: [],
  missingRateQuotes: [],
  effects: [],
  reconciled: 0,
  fingerprint: 'fp',
  target: { currency: null, precision: 2 },
  changed: 1,
  unsupported: [],
  restamp: [],
  ...fields,
});

function setup(
  handlers: Record<string, ReturnType<typeof vi.fn>>,
  which: 'correction' | 'repair' = 'correction',
  reconciled: Array<{ id: string; account: string }> = [],
) {
  vi.mocked(aqlQuery).mockResolvedValue({
    data: reconciled,
    dependencies: [],
  });
  initServer({
    'budget/edit-effects': async () => [],
    'payees-get': async () => [],
    ...handlers,
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
    }),
  );
  store.dispatch(
    pushModal({
      modal:
        which === 'correction'
          ? { name: 'currency-correction', options: { accountId: 'jpy' } }
          : { name: 'stale-encoding-repair', options: { accountId: 'jpy' } },
    }),
  );
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(accountQueries.list().queryKey, [yen, savings]);
  render(
    <TestProviders store={store} queryClient={queryClient}>
      <MemoryRouter>
        <HotkeysProvider>
          {which === 'correction' ? (
            <CurrencyCorrectionModal accountId="jpy" />
          ) : (
            <StaleEncodingRepairModal accountId="jpy" />
          )}
        </HotkeysProvider>
      </MemoryRouter>
    </TestProviders>,
  );
  return { store };
}

async function chooseUsd() {
  await userEvent.click(
    document.querySelector<HTMLElement>('#correction-currency-select')!,
  );
  await userEvent.click(await screen.findByText(/^USD - /));
}

const apply = () =>
  screen.getByRole('button', { name: 'Change currency' }) as HTMLButtonElement;

describe('CurrencyCorrectionModal', () => {
  it('keeps the numbers by default and applies exactly the preview', async () => {
    const previewCall = vi.fn(async () => preview());
    const correct = vi.fn(async () => ({ status: 'ok', changed: 1 }));
    const { store } = setup({
      'accounts/currency-correction-preview': previewCall,
      'accounts/correct-currency': correct,
    });
    expect(
      screen.getByRole('radio', { name: /Keep the numbers/ }),
    ).toBeChecked();
    expect(apply()).toBeDisabled();
    await chooseUsd();
    expect(
      await screen.findByText('Transactions that change: 1.'),
    ).toBeVisible();
    expect(screen.getByText('This change cannot be undone.')).toBeVisible();
    expect(previewCall).toHaveBeenCalledWith({
      account: 'jpy',
      currency: 'USD',
      mode: 'keep',
    });
    await userEvent.click(apply());
    await waitFor(() =>
      expect(correct).toHaveBeenCalledWith({
        account: 'jpy',
        currency: 'USD',
        mode: 'keep',
        fingerprint: 'fp',
      }),
    );
    await waitFor(() => expect(store.getState().modals.modalStack).toEqual([]));
  });

  it('asks for each missing currency rate and keeps Apply disabled', async () => {
    setup({
      'accounts/currency-correction-preview': vi.fn(async () =>
        preview({
          missingRates: ['2026-03-10'],
          missingRateQuotes: [
            { date: '2026-03-10', currency: 'EUR' },
            { date: '2026-03-10', currency: 'JPY' },
          ],
        }),
      ),
    });
    await chooseUsd();
    expect(
      await screen.findAllByText(/No exchange rate is saved for 2026-03-10/),
    ).toHaveLength(2);
    expect(apply()).toBeDisabled();
  });

  it('lists removed schedule links apart from amount changes', async () => {
    setup({
      'accounts/currency-correction-preview': vi.fn(async () =>
        preview({
          rows: [
            row('a'),
            row('b', {
              external: true,
              account: 'kwd',
              scheduleUnlinked: true,
              after: { amount: -1000, transaction_amount: -1500 },
            }),
          ],
        }),
      ),
    });
    await chooseUsd();
    expect(
      await screen.findByText(
        'These transactions will no longer be linked to their schedule:',
      ),
    ).toBeVisible();
    expect(screen.getByText('Savings, 2026-03-10')).toBeVisible();
  });

  it('explains refusals, including row errors, and disables Apply', async () => {
    setup({
      'accounts/currency-correction-preview': vi.fn(async () =>
        preview({
          rows: [row('a', { after: null, error: 'amount-out-of-range' })],
        }),
      ),
    });
    await chooseUsd();
    expect(
      await screen.findByText(/An amount would be too large/),
    ).toBeVisible();
    expect(apply()).toBeDisabled();
  });

  it('shows a server refusal with what to do', async () => {
    setup({
      'accounts/currency-correction-preview': vi.fn(async () => {
        throw new Error('correction-schedule-action-unsupported');
      }),
    });
    await chooseUsd();
    expect(await screen.findByText(/sets a fixed split amount/)).toBeVisible();
    expect(apply()).toBeDisabled();
  });

  it('re-previews a stale apply and says why', async () => {
    const previewCall = vi.fn(async () => preview());
    setup({
      'accounts/currency-correction-preview': previewCall,
      'accounts/correct-currency': vi.fn(async () => ({ status: 'stale' })),
    });
    await chooseUsd();
    await screen.findByText('Transactions that change: 1.');
    await userEvent.click(apply());
    expect(
      await screen.findByText(/Something changed on this or another device/),
    ).toBeVisible();
    expect(previewCall).toHaveBeenCalledTimes(2);
  });

  it('confirms reconciled rows once, with the transfer wording for other accounts only', async () => {
    const { store } = setup(
      {
        'accounts/currency-correction-preview': vi.fn(async () => preview()),
      },
      'correction',
      [{ id: 'b', account: 'kwd' }],
    );
    await chooseUsd();
    await screen.findByText('Transactions that change: 1.');
    await userEvent.click(apply());
    const confirm = await waitFor(() => {
      const modal = store
        .getState()
        .modals.modalStack.find(m => m.name === 'confirm-transaction-edit');
      assert(modal);
      return modal;
    });
    assert(confirm.name === 'confirm-transaction-edit');
    expect(confirm.options.confirmReason).toBe(
      'batchEditWithReconciledTransfer',
    );
  });
});

describe('CurrencyCorrectionModal (Sol re-review)', () => {
  it('counts a rounded row whose stored integers stay the same', async () => {
    setup({
      'accounts/currency-correction-preview': vi.fn(async () =>
        preview({
          rows: [
            row('a'),
            row('r', {
              before: { amount: -1, transaction_amount: -1 },
              after: { amount: -1, transaction_amount: -1 },
              roundingLoss: true,
            }),
          ],
        }),
      ),
    });
    await chooseUsd();
    expect(
      await screen.findByText(
        /Rounded to the new currency's decimal places: 1/,
      ),
    ).toBeInTheDocument();
  });

  it('holds the dialog while reconciled rows are checked, applying once', async () => {
    const correct = vi.fn(async () => ({ status: 'ok' }));
    setup({
      'accounts/currency-correction-preview': vi.fn(async () => preview()),
      'accounts/correct-currency': correct,
    });
    let release: (value: { data: never[]; dependencies: never[] }) => void =
      vi.fn();
    vi.mocked(aqlQuery).mockReturnValueOnce(
      new Promise(resolve => {
        release = resolve;
      }),
    );
    await chooseUsd();
    await screen.findByText('Transactions that change: 1.');
    await userEvent.click(apply());
    await userEvent.click(apply());
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
    release({ data: [], dependencies: [] });
    await waitFor(() => expect(correct).toHaveBeenCalledTimes(1));
  });
});

describe('CurrencyCorrectionModal follow-ups', () => {
  it('uses the editReconciled wording when this account has reconciled rows', async () => {
    const { store } = setup(
      { 'accounts/currency-correction-preview': vi.fn(async () => preview()) },
      'correction',
      [{ id: 'a', account: 'jpy' }],
    );
    await chooseUsd();
    await screen.findByText('Transactions that change: 1.');
    await userEvent.click(apply());
    const confirm = await waitFor(() => {
      const modal = store
        .getState()
        .modals.modalStack.find(m => m.name === 'confirm-transaction-edit');
      assert(modal);
      return modal;
    });
    assert(confirm.name === 'confirm-transaction-edit');
    expect(confirm.options.confirmReason).toBe('editReconciled');
  });

  it('says the account already has the currency', async () => {
    setup({
      'accounts/currency-correction-preview': vi.fn(async () => {
        throw new Error('account-currency-unchanged');
      }),
    });
    await chooseUsd();
    expect(
      await screen.findByText(
        'This account already uses the selected currency.',
      ),
    ).toBeVisible();
  });

  it('re-previews after a rate is saved', async () => {
    const previewCall = vi
      .fn()
      .mockResolvedValueOnce(
        preview({
          missingRates: ['2026-03-10'],
          missingRateQuotes: [{ date: '2026-03-10', currency: 'EUR' }],
        }),
      )
      .mockResolvedValue(preview());
    setup({
      'accounts/currency-correction-preview': previewCall,
      'exchange-rates/save': vi.fn(async () => ({ status: 'saved', id: 'r' })),
    });
    await chooseUsd();
    await userEvent.type(
      await waitFor(() => {
        const input = document.querySelector<HTMLInputElement>(
          'input[name="importRate"]',
        );
        assert(input);
        return input;
      }),
      '0.9',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Save rate' }));
    await waitFor(() => expect(apply()).toBeEnabled());
    expect(previewCall).toHaveBeenCalledTimes(2);
  });

  it('re-previews after a repair it opened succeeds', async () => {
    const previewCall = vi
      .fn()
      .mockRejectedValueOnce(new Error('correction-stale-rows-pending'))
      .mockResolvedValue(preview());
    const { store } = setup({
      'accounts/currency-correction-preview': previewCall,
    });
    await chooseUsd();
    await userEvent.click(
      await screen.findByRole('button', { name: 'Repair…' }),
    );
    const repair = store
      .getState()
      .modals.modalStack.find(m => m.name === 'stale-encoding-repair');
    assert(repair && repair.name === 'stale-encoding-repair');
    repair.options.onRepaired?.();
    expect(
      await screen.findByText('Transactions that change: 1.'),
    ).toBeVisible();
    expect(apply()).toBeEnabled();
  });
});

describe('StaleEncodingRepairModal', () => {
  it('converts by default and lists unsupported transfers in the budget currency', async () => {
    const previewCall = vi.fn(async () =>
      preview({
        rows: [
          row('leg', {
            before: { amount: -600, transaction_amount: null },
            after: { amount: -600, transaction_amount: null },
          }),
        ],
        unsupported: ['leg'],
        restamp: [],
      }),
    );
    setup({ 'accounts/stale-encoding-preview': previewCall }, 'repair');
    expect(
      screen.getByRole('radio', { name: /Convert existing amounts/ }),
    ).toBeChecked();
    expect(
      await screen.findByText(
        'These transfers keep the earlier currency until you delete them:',
        {},
        // The preview and its payee lookup can be slow when suites share a
        // machine.
        { timeout: 5000 },
      ),
    ).toBeVisible();
    expect(screen.getByText(/2026-03-10 +.*6\.00/)).toBeVisible();
    expect(screen.queryByLabelText('Currency')).toBeNull();
    // Nothing it can repair: Apply stays disabled.
    expect(screen.getByRole('button', { name: 'Repair' })).toBeDisabled();
    expect(previewCall).toHaveBeenCalledWith({
      account: 'jpy',
      mode: 'convert',
    });
  });
});

describe('StaleEncodingWarning', () => {
  it('sums every earlier currency for the account', async () => {
    initServer({
      'accounts/stale-encoding': async () => [
        { account: 'jpy', stamp: '', count: 2 },
        { account: 'jpy', stamp: 'KWD.3', count: 3 },
        { account: 'other', stamp: '', count: 9 },
      ],
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
        'flags.currency': 'true',
        'flags.multicurrency': 'true',
      }),
    );
    render(
      <TestProviders store={store} queryClient={createTestQueryClient()}>
        <StaleEncodingWarning accountId="jpy" />
      </TestProviders>,
    );
    expect(
      await screen.findByText(
        'Transactions from another device that use an earlier currency: 5.',
      ),
    ).toBeVisible();
    expect(screen.getByRole('button', { name: 'Repair…' })).toBeVisible();
  });
});
