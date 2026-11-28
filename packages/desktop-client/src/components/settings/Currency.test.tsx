import type { ChangeEvent } from 'react';

import { initServer } from '@actual-app/core/platform/client/connection';
import type { AccountEntity } from '@actual-app/core/types/models';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { TestProviders } from '#mocks';

import { CurrencySettings } from './Currency';

vi.mock(
  '@actual-app/core/platform/client/connection',
  () => import('#mocks/connection'),
);

let mockPrefs: Record<string, string> = {};
const mockSetPref = vi.fn();
let mockAccounts: AccountEntity[] = [];

vi.mock('#hooks/useSyncedPref', () => ({
  useSyncedPref: (name: string) => [
    mockPrefs[name],
    (value: string) => mockSetPref(name, value),
  ],
}));

// The preferences the server saved are read again
const mockLoadPrefs = vi.fn(() => () => Promise.resolve());
vi.mock('#prefs/prefsSlice', async importOriginal => ({
  ...(await importOriginal<Record<string, unknown>>()),
  loadPrefs: () => mockLoadPrefs(),
}));

vi.mock('#hooks/useAccounts', () => ({
  useAccounts: () => ({ data: mockAccounts }),
}));

// A native select, so a test can pick an option
vi.mock('@actual-app/components/select', () => ({
  Select: ({
    value,
    options,
    onChange,
  }: {
    value: string;
    options: Array<readonly [unknown, string] | unknown>;
    onChange: (value: string) => void;
  }) => (
    <select
      value={value}
      onChange={(e: ChangeEvent<HTMLSelectElement>) => onChange(e.target.value)}
    >
      {options
        .filter(
          (option): option is [string, string] =>
            Array.isArray(option) && typeof option[0] === 'string',
        )
        .map(([optionValue, label]) => (
          <option key={optionValue} value={optionValue}>
            {label}
          </option>
        ))}
    </select>
  ),
}));

function makeAccount(
  id: string,
  fields: Partial<AccountEntity> = {},
): AccountEntity {
  return {
    id,
    name: id,
    offbudget: 0,
    closed: 0,
    sort_order: 0,
    last_reconciled: null,
    tombstone: 0,
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
    account_group_id: null,
    currency: null,
    ...fields,
  };
}

function renderSettings() {
  render(
    <TestProviders>
      <CurrencySettings />
    </TestProviders>,
  );
}

function chooseDefaultCurrency(code: string) {
  fireEvent.change(screen.getAllByRole('combobox')[0], {
    target: { value: code },
  });
}

describe('CurrencySettings', () => {
  beforeEach(() => {
    mockPrefs = {
      'flags.currency': 'true',
      'flags.multiCurrency': 'true',
      defaultCurrencyCode: 'CAD',
    };
    mockSetPref.mockClear();
    mockAccounts = [
      makeAccount('checking', { currency: 'CAD' }),
      makeAccount('usd', { currency: 'USD' }),
    ];
  });

  it('changes the default in one step once the user confirms', async () => {
    const change = vi.fn(async () => undefined);
    initServer({
      'currency-default-change': change,
    });
    renderSettings();

    chooseDefaultCurrency('EUR');
    // CAD isn't budgeted on its own, so its budgets are converted
    expect(
      screen.getByText(/amounts budgeted in CAD are converted/),
    ).toBeInTheDocument();
    expect(change).not.toHaveBeenCalled();

    await userEvent.click(
      screen.getByRole('button', { name: 'Change to EUR' }),
    );
    await waitFor(() =>
      expect(change).toHaveBeenCalledWith({
        currency: 'EUR',
        format: {
          numberFormat: 'dot-comma',
          hideFraction: 'false',
          currencySpaceBetweenAmountAndSymbol: 'true',
          currencySymbolPosition: 'after',
        },
      }),
    );
    await waitFor(() => expect(mockLoadPrefs).toHaveBeenCalled());
    // The server saves the default along with everything else
    expect(mockSetPref).not.toHaveBeenCalledWith(
      'defaultCurrencyCode',
      expect.anything(),
    );
    await waitFor(() =>
      expect(
        screen.queryByText(/Accounts keep their currency/),
      ).not.toBeInTheDocument(),
    );
  });

  it('says when budgets in the old default keep their currency', () => {
    mockPrefs['currency-own-lines'] = '*:0';
    renderSettings();

    chooseDefaultCurrency('EUR');
    expect(
      screen.getByText(/budgets in CAD move to CAD lines/),
    ).toBeInTheDocument();
  });

  it('says from which month budgets in the old default keep their currency', () => {
    mockPrefs['currency-own-lines'] = '*:202611';
    renderSettings();

    chooseDefaultCurrency('EUR');
    expect(
      screen.getByText(/CAD is budgeted on its own from November 2026/),
    ).toBeInTheDocument();
  });

  it('keeps the default when the change is cancelled', async () => {
    const change = vi.fn(async () => undefined);
    initServer({
      'currency-default-change': change,
    });
    renderSettings();

    chooseDefaultCurrency('JPY');
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(change).not.toHaveBeenCalled();
    expect(
      screen.queryByText(/Accounts keep their currency/),
    ).not.toBeInTheDocument();
  });

  it('gives accounts the first default currency without asking', async () => {
    mockPrefs.defaultCurrencyCode = '';
    const change = vi.fn(async () => undefined);
    initServer({
      'currency-default-change': change,
    });
    renderSettings();

    chooseDefaultCurrency('JPY');
    await waitFor(() =>
      expect(change).toHaveBeenCalledWith({
        currency: 'JPY',
        format: expect.objectContaining({ hideFraction: 'true' }),
      }),
    );
  });

  it('only changes the format while multiple currencies are off', () => {
    mockPrefs['flags.multiCurrency'] = 'false';
    renderSettings();

    chooseDefaultCurrency('EUR');

    expect(mockSetPref).toHaveBeenCalledWith('defaultCurrencyCode', 'EUR');
    expect(mockSetPref).toHaveBeenCalledWith('numberFormat', 'dot-comma');
  });

  it.each([
    ['CAD', '100.00'],
    ['JPY', '100'],
  ])(
    'shows the symbol examples of %s with its decimal places',
    (code, amount) => {
      mockPrefs.defaultCurrencyCode = code;
      renderSettings();

      expect(
        screen.getByRole('option', { name: `No symbol, e.g. ${amount}` }),
      ).toBeInTheDocument();
    },
  );

  it.each([
    ['', 'None: spending in other currencies is converted'],
    ['*:0', 'Every currency'],
    ['USD:0,COP:202611', 'COP, USD'],
  ])('tells which currencies are budgeted on their own (%s)', (value, text) => {
    mockPrefs['currency-own-lines'] = value;
    renderSettings();

    expect(screen.getByText(text)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Change' })).toBeInTheDocument();
  });
});
