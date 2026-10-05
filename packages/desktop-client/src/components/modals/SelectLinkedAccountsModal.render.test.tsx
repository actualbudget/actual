import type { ReactNode } from 'react';

import { initServer } from '@actual-app/core/platform/client/connection';
import type { AccountEntity } from '@actual-app/core/types/models';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { createTestAppStore, TestProviders } from '#mocks';
import { closeModal } from '#modals/modalsSlice';
import type * as ModalsSlice from '#modals/modalsSlice';
import { mergeSyncedPrefs } from '#prefs/prefsSlice';

import { SelectLinkedAccountsModal } from './SelectLinkedAccountsModal';

const linkSimpleFin = vi.fn();
const unlinkAccount = vi.hoisted(() => vi.fn());
const narrow = vi.hoisted(() => ({ value: true }));
const startingBalanceRows = vi.hoisted(() => ({
  value: [] as Array<{
    date: string;
    amount: number;
    transaction_amount: number | null;
  }>,
}));

vi.mock(
  '@actual-app/core/platform/client/connection',
  () => import('#mocks/connection'),
);
vi.mock('@actual-app/components/hooks/useResponsive', () => ({
  useResponsive: () => ({ isNarrowWidth: narrow.value }),
}));
vi.mock('#components/common/Modal', () => ({
  Modal: ({
    children,
  }: {
    children: (state: { state: { close: () => void } }) => ReactNode;
  }) => children({ state: { close: vi.fn() } }),
  ModalHeader: () => null,
  ModalCloseButton: () => null,
}));
vi.mock('#modals/modalsSlice', async importOriginal => {
  const actual = await importOriginal<typeof ModalsSlice>();
  return { ...actual, closeModal: vi.fn(actual.closeModal) };
});
vi.mock('#queries/liveQuery', () => ({
  liveQuery: (
    _query: never,
    { onData }: { onData: (rows: typeof startingBalanceRows.value) => void },
  ) => {
    onData(startingBalanceRows.value);
    return { unsubscribe: vi.fn() };
  },
}));
const localAccounts = vi.hoisted(() => ({ value: [] as AccountEntity[] }));
vi.mock('#hooks/useAccounts', () => ({
  useAccounts: () => ({ data: localAccounts.value }),
}));
vi.mock('#accounts', () => {
  const mutation = () => ({ mutate: vi.fn(), mutateAsync: vi.fn() });
  return {
    useLinkAccountMutation: mutation,
    useLinkAccountSimpleFinMutation: () => ({
      mutate: vi.fn(),
      mutateAsync: linkSimpleFin,
    }),
    useLinkAccountPluggyAiMutation: mutation,
    useLinkAccountAkahuMutation: mutation,
    useLinkAccountEnableBankingMutation: mutation,
    useUnlinkAccountMutation: () => ({ mutate: unlinkAccount }),
  };
});

function yenAccount(overrides: Partial<AccountEntity> = {}): AccountEntity {
  return {
    id: 'yen',
    name: 'Yen wallet',
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
    currency: 'JPY',
    currency_precision: 0,
    ...overrides,
  };
}

const externalAccount = {
  account_id: 'remote',
  name: 'Remote yen',
  institution: 'Bank',
  balance: 10000,
  currency: 'JPY',
};

function renderModal(
  externalAccounts = [externalAccount],
  upgradingAccountId: string | undefined = 'yen',
) {
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
    <TestProviders store={store}>
      <SelectLinkedAccountsModal
        syncSource="simpleFin"
        externalAccounts={externalAccounts}
        upgradingAccountId={upgradingAccountId}
      />
    </TestProviders>,
  );
}

beforeEach(() => {
  linkSimpleFin.mockReset();
  unlinkAccount.mockReset();
  vi.mocked(closeModal).mockClear();
  narrow.value = true;
  startingBalanceRows.value = [];
  localAccounts.value = [yenAccount()];
});

it('stays open on a missing rate and retries after the rate is saved', async () => {
  const save = vi.fn(async (): Promise<{ status: 'saved'; id: string }> => ({
    status: 'saved',
    id: 'rate',
  }));
  initServer({ 'exchange-rates/save': save });
  linkSimpleFin
    .mockResolvedValueOnce({
      type: 'rate-unavailable',
      currency: 'JPY',
      dates: ['2026-03-05'],
    })
    .mockResolvedValueOnce({ type: 'ok', currencyMismatches: 0 });
  renderModal();

  fireEvent.click(screen.getByRole('button', { name: 'Link accounts' }));
  expect(
    await screen.findByText(/No exchange rate is saved for 2026-03-05/),
  ).toBeInTheDocument();
  expect(closeModal).not.toHaveBeenCalled();

  fireEvent.change(screen.getByPlaceholderText('Rate'), {
    target: { value: '150' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Save rate' }));

  await waitFor(() => expect(closeModal).toHaveBeenCalled());
  expect(save).toHaveBeenCalledWith(
    expect.objectContaining({ quoteCurrency: 'JPY', date: '2026-03-05' }),
  );
  expect(linkSimpleFin).toHaveBeenCalledTimes(2);
  expect(linkSimpleFin).toHaveBeenLastCalledWith(
    expect.objectContaining({ upgradingId: 'yen' }),
  );
});

it('asks for a native starting balance when the bank reports none', async () => {
  linkSimpleFin
    .mockResolvedValueOnce({ type: 'balance-unavailable' })
    .mockResolvedValueOnce({ type: 'ok', currencyMismatches: 0 });
  renderModal();

  fireEvent.click(screen.getByRole('button', { name: 'Link accounts' }));
  expect(
    await screen.findByText(/did not report a balance/),
  ).toBeInTheDocument();
  const balance = screen.getByText('Balance on that date:').nextElementSibling;
  const input = balance?.querySelector('input');
  assert(input, 'Expected starting balance input');
  fireEvent.focus(input);
  fireEvent.change(input, { target: { value: '9000' } });
  fireEvent.blur(input);

  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
  await waitFor(() => expect(closeModal).toHaveBeenCalled());
  // The yen account stores whole yen: 9000 is 9000 native units.
  expect(linkSimpleFin).toHaveBeenLastCalledWith(
    expect.objectContaining({ startingBalance: 9000 }),
  );
});

it.each([true, false])(
  "shows an existing foreign account's native starting balance (narrow %s)",
  isNarrow => {
    narrow.value = isNarrow;
    localAccounts.value = [
      yenAccount({ account_id: 'remote', account_sync_source: 'simpleFin' }),
    ];
    startingBalanceRows.value = [
      { date: '2026-03-01', amount: 1000, transaction_amount: 1500 },
    ];
    renderModal();
    expect(screen.getAllByText(/1,500/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/10\.00/)).toBeNull();
  },
);

it('keeps the dialog open when a foreign link fails', async () => {
  linkSimpleFin.mockRejectedValueOnce(
    new Error('bank-account-currency-mismatch'),
  );
  renderModal();

  fireEvent.click(screen.getByRole('button', { name: 'Link accounts' }));
  expect(
    await screen.findByText('This account could not be linked.'),
  ).toBeInTheDocument();
  expect(closeModal).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
});

it('does not preselect an account in another currency', () => {
  localAccounts.value = [
    yenAccount({ currency: 'KWD', currency_precision: 3 }),
  ];
  renderModal();
  expect(screen.getByText('Not linked')).toBeInTheDocument();
});

it('retries only the links that wrote nothing', async () => {
  const save = vi.fn(async (): Promise<{ status: 'saved'; id: string }> => ({
    status: 'saved',
    id: 'rate',
  }));
  initServer({ 'exchange-rates/save': save });
  localAccounts.value = [
    yenAccount({ id: 'yen-a', name: 'Yen A', account_id: 'remote-a' }),
    yenAccount({ id: 'yen-b', name: 'Yen B', account_id: 'remote-b' }),
  ];
  linkSimpleFin.mockImplementation(async ({ upgradingId }) =>
    upgradingId === 'yen-a' || linkSimpleFin.mock.calls.length > 2
      ? { type: 'ok', currencyMismatches: 0 }
      : { type: 'rate-unavailable', currency: 'JPY', dates: ['2026-03-05'] },
  );
  renderModal(
    [
      { ...externalAccount, account_id: 'remote-a', name: 'Remote A' },
      { ...externalAccount, account_id: 'remote-b', name: 'Remote B' },
    ],
    undefined,
  );

  fireEvent.click(screen.getByRole('button', { name: 'Link accounts' }));
  await screen.findByText(/No exchange rate is saved/);
  fireEvent.change(screen.getByPlaceholderText('Rate'), {
    target: { value: '150' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Save rate' }));

  await waitFor(() => expect(closeModal).toHaveBeenCalled());
  expect(
    linkSimpleFin.mock.calls.map(([{ upgradingId }]) => upgradingId),
  ).toEqual(['yen-a', 'yen-b', 'yen-b']);
});

it('sends a failed base link again on retry', async () => {
  const save = vi.fn(async (): Promise<{ status: 'saved'; id: string }> => ({
    status: 'saved',
    id: 'rate',
  }));
  initServer({ 'exchange-rates/save': save });
  localAccounts.value = [
    yenAccount({ id: 'yen-a', name: 'Yen A', account_id: 'remote-a' }),
    yenAccount({
      id: 'usd-b',
      name: 'Dollars B',
      account_id: 'remote-b',
      currency: null,
      currency_precision: null,
    }),
  ];
  let calls = 0;
  linkSimpleFin.mockImplementation(async ({ upgradingId }) => {
    calls += 1;
    if (upgradingId === 'usd-b') {
      if (calls <= 2) throw new Error('network');
      return { type: 'ok', currencyMismatches: 0 };
    }
    return calls <= 2
      ? { type: 'rate-unavailable', currency: 'JPY', dates: ['2026-03-05'] }
      : { type: 'ok', currencyMismatches: 0 };
  });
  renderModal(
    [
      { ...externalAccount, account_id: 'remote-a', name: 'Remote A' },
      {
        ...externalAccount,
        account_id: 'remote-b',
        name: 'Remote B',
        currency: 'USD',
      },
    ],
    undefined,
  );

  fireEvent.click(screen.getByRole('button', { name: 'Link accounts' }));
  await screen.findByText(/No exchange rate is saved/);
  fireEvent.change(screen.getByPlaceholderText('Rate'), {
    target: { value: '150' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Save rate' }));

  await waitFor(() => expect(closeModal).toHaveBeenCalled());
  expect(
    linkSimpleFin.mock.calls
      .map(([{ upgradingId }]) => String(upgradingId))
      .sort((a, b) => a.localeCompare(b)),
  ).toEqual(['usd-b', 'usd-b', 'yen-a', 'yen-a']);
});

it('keeps an account created by an earlier attempt on retry', async () => {
  initServer({
    'exchange-rates/save': async () => ({ status: 'saved', id: 'rate' }),
  });
  localAccounts.value = [];
  let yenCalls = 0;
  linkSimpleFin.mockImplementation(async ({ externalAccount }) => {
    if (externalAccount.account_id === 'remote-b') {
      // The base link creates its account, as the server does.
      localAccounts.value = [
        yenAccount({
          id: 'created-b',
          account_id: 'remote-b',
          currency: null,
          currency_precision: null,
        }),
      ];
      return { type: 'ok', currencyMismatches: 0 };
    }
    yenCalls += 1;
    return yenCalls === 1
      ? { type: 'rate-unavailable', currency: 'JPY', dates: ['2026-03-05'] }
      : { type: 'ok', currencyMismatches: 0 };
  });
  renderModal(
    [
      { ...externalAccount, account_id: 'remote-a', name: 'Remote A' },
      {
        ...externalAccount,
        account_id: 'remote-b',
        name: 'Remote B',
        currency: 'USD',
      },
    ],
    undefined,
  );
  for (const name of ['Remote A', 'Remote B']) {
    fireEvent.click(screen.getAllByRole('button', { name: 'Link account' })[0]);
    fireEvent.click((await screen.findAllByText('Create new account')).at(-1)!);
    await waitFor(() =>
      expect(
        screen.queryAllByRole('button', { name: 'Link account' }),
      ).toHaveLength(name === 'Remote A' ? 1 : 0),
    );
  }

  fireEvent.click(screen.getByRole('button', { name: 'Link accounts' }));
  await screen.findByText(/No exchange rate is saved/);
  fireEvent.change(screen.getByPlaceholderText('Rate'), {
    target: { value: '150' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Save rate' }));

  await waitFor(() => expect(closeModal).toHaveBeenCalled());
  expect(unlinkAccount).not.toHaveBeenCalled();
  expect(
    linkSimpleFin.mock.calls
      .map(([call]) => String(call.externalAccount.account_id))
      .sort((a, b) => a.localeCompare(b)),
  ).toEqual(['remote-a', 'remote-a', 'remote-b']);
});
