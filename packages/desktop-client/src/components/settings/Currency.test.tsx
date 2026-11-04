import type { ChangeEvent } from 'react';

import type { AccountEntity } from '@actual-app/core/types/models';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { TestProviders } from '#mocks';

import { CurrencySettings } from './Currency';

let mockPrefs: Record<string, string> = {};
const mockSetPref = vi.fn();
let mockAccounts: AccountEntity[] = [];
// The accounts the transactions query finds
let mockTransactionAccounts: Array<{ account: string }> | null = [];
const mockMutate = vi.fn();

vi.mock('#hooks/useSyncedPref', () => ({
  useSyncedPref: (name: string) => [
    mockPrefs[name],
    (value: string) => mockSetPref(name, value),
  ],
}));

const mockUpdateRates = vi.fn();
vi.mock('#hooks/useUpdateExchangeRates', () => ({
  useUpdateExchangeRates: () => mockUpdateRates,
}));

vi.mock('#hooks/useAccounts', () => ({
  useAccounts: () => ({ data: mockAccounts }),
}));

vi.mock('#hooks/useQuery', () => ({
  useQuery: () => ({ data: mockTransactionAccounts, isLoading: false }),
}));

vi.mock('#accounts', () => ({
  useSetAccountsCurrencyMutation: () => ({
    mutate: mockMutate,
    isPending: false,
  }),
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
    mockMutate.mockReset();
    mockAccounts = [
      makeAccount('checking'),
      makeAccount('old-savings', { closed: 1 }),
      makeAccount('empty'),
      makeAccount('usd', { currency: 'USD' }),
    ];
    mockTransactionAccounts = [
      { account: 'checking' },
      { account: 'old-savings' },
    ];
  });

  it('asks about the accounts with transactions that follow the default', async () => {
    renderSettings();

    chooseDefaultCurrency('EUR');

    expect(
      screen.getByText(
        'Accounts with transactions that follow the default currency (CAD): 2. Their amounts are not converted when the default changes.',
      ),
    ).toBeInTheDocument();
    expect(mockSetPref).not.toHaveBeenCalledWith(
      'defaultCurrencyCode',
      expect.anything(),
    );

    await userEvent.click(screen.getByText('Keep them in CAD'));

    expect(mockMutate).toHaveBeenCalledWith(
      { ids: ['checking', 'old-savings'], currency: 'CAD' },
      expect.anything(),
    );
  });

  it('changes the default only once the accounts are kept', async () => {
    mockMutate.mockImplementation(
      (_payload, { onSuccess }: { onSuccess: () => void }) => onSuccess(),
    );
    renderSettings();

    chooseDefaultCurrency('EUR');
    await userEvent.click(screen.getByText('Keep them in CAD'));

    expect(mockSetPref).toHaveBeenCalledWith('defaultCurrencyCode', 'EUR');
  });

  it('changes the default right away when no account that follows it has transactions', () => {
    mockTransactionAccounts = [{ account: 'usd' }];
    renderSettings();

    chooseDefaultCurrency('EUR');

    expect(mockSetPref).toHaveBeenCalledWith('defaultCurrencyCode', 'EUR');
    expect(screen.queryByText('Keep them in CAD')).not.toBeInTheDocument();
  });

  it('asks while it is not known yet which accounts have transactions', () => {
    mockTransactionAccounts = null;
    renderSettings();

    chooseDefaultCurrency('EUR');

    expect(screen.getByText('Keep them in CAD')).toBeInTheDocument();
  });

  it('does not ask while multiple currencies are off', () => {
    mockPrefs['flags.multiCurrency'] = 'false';
    renderSettings();

    chooseDefaultCurrency('EUR');

    expect(mockSetPref).toHaveBeenCalledWith('defaultCurrencyCode', 'EUR');
  });

  it('offers the same choices for a default currency without decimals', async () => {
    renderSettings();

    chooseDefaultCurrency('JPY');
    expect(screen.getByText('Keep them in CAD')).toBeInTheDocument();
    await userEvent.click(screen.getByText('Relabel them as JPY'));

    expect(mockSetPref).toHaveBeenCalledWith('defaultCurrencyCode', 'JPY');
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

  it('turns automatic exchange rate updates on and fetches rates right away', async () => {
    mockUpdateRates.mockClear();
    renderSettings();

    await userEvent.click(
      screen.getByRole('checkbox', {
        name: 'Update exchange rates automatically',
      }),
    );

    expect(mockSetPref).toHaveBeenCalledWith(
      'exchange-rates-auto-update',
      'true',
    );
    expect(mockUpdateRates).toHaveBeenCalledWith({ showProgress: true });
  });

  it('fetches nothing when automatic exchange rate updates are turned off', async () => {
    mockUpdateRates.mockClear();
    mockPrefs['exchange-rates-auto-update'] = 'true';
    renderSettings();

    await userEvent.click(
      screen.getByRole('checkbox', {
        name: 'Update exchange rates automatically',
      }),
    );

    expect(mockSetPref).toHaveBeenCalledWith(
      'exchange-rates-auto-update',
      'false',
    );
    expect(mockUpdateRates).not.toHaveBeenCalled();
  });

  it('only saves a Frankfurter server address that is a web address', async () => {
    renderSettings();
    const input = screen.getByRole('textbox', {
      name: 'Frankfurter server address',
    });

    await userEvent.type(input, 'rates.example.com');
    fireEvent.blur(input);
    expect(
      screen.getByText(
        'Enter an address that starts with https:// or http://.',
      ),
    ).toBeInTheDocument();
    expect(mockSetPref).not.toHaveBeenCalled();

    await userEvent.clear(input);
    await userEvent.type(input, 'https://rates.example.com');
    fireEvent.blur(input);
    expect(mockSetPref).toHaveBeenCalledWith(
      'exchange-rates-provider-url',
      'https://rates.example.com',
    );
  });
});
