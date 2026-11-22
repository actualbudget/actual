import { useState } from 'react';
import { MemoryRouter } from 'react-router';

import { generateAccount } from '@actual-app/core/mocks';
import type { AccountEntity } from '@actual-app/core/types/models';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { accountQueries } from '#accounts';
import {
  configureTestAppStore,
  createTestQueryClient,
  TestProviders,
} from '#mocks';
import { mergeSyncedPrefs } from '#prefs/prefsSlice';

import { useBuiltInBankSyncProviders } from './useBuiltInBankSyncProviders';
import type { BuiltInBankSyncProviderState } from './useBuiltInBankSyncProviders';

import { BankSync } from './index';

vi.mock('./useBuiltInBankSyncProviders', () => ({
  useBuiltInBankSyncProviders: vi.fn(),
}));

function makeProvider(
  overrides: Partial<BuiltInBankSyncProviderState> = {},
): BuiltInBankSyncProviderState {
  return {
    id: 'simpleFin',
    displayName: 'SimpleFIN',
    region: 'US and Canadian banks',
    isConfigured: false,
    credentialSource: 'global',
    supportsPerBudgetFile: true,
    canConfigure: true,
    onConfigure: vi.fn(),
    onLink: vi.fn(),
    onReset: vi.fn(),
    ...overrides,
  };
}

const linkedAccount: AccountEntity = {
  ...generateAccount('Linked checking', true),
  id: 'linked',
  bankName: 'Test Bank',
  account_sync_source: 'simpleFin',
  last_sync: String(Date.now() - 2 * 60 * 60 * 1000),
};
const unlinkedAccount: AccountEntity = {
  ...generateAccount('Cash'),
  id: 'unlinked',
};

type ProvidersState = ReturnType<typeof useBuiltInBankSyncProviders>;

function mockProviders(state: Partial<ProvidersState> = {}) {
  vi.mocked(useBuiltInBankSyncProviders).mockReturnValue({
    providers: [
      makeProvider(),
      makeProvider({ id: 'goCardless', displayName: 'GoCardless' }),
    ],
    syncServerStatus: 'online',
    permissionWarning: null,
    isLoading: false,
    ...state,
  });
}

function mockLiveProviders(initialState: Partial<ProvidersState>) {
  let rerenderHook: () => void = () => undefined;
  let currentState: ProvidersState = {
    providers: [],
    syncServerStatus: 'online',
    permissionWarning: null,
    isLoading: false,
    ...initialState,
  };
  vi.mocked(useBuiltInBankSyncProviders).mockImplementation(() => {
    const [, setTick] = useState(0);
    rerenderHook = () => setTick(tick => tick + 1);
    return currentState;
  });
  return (nextState: Partial<ProvidersState>) => {
    currentState = { ...currentState, ...nextState };
    act(() => rerenderHook());
  };
}

function renderPage(accounts: AccountEntity[]) {
  const queryClient = createTestQueryClient();
  const store = configureTestAppStore({ queryClient });
  queryClient.setQueryData(accountQueries.list().queryKey, accounts);
  const tree = () => (
    <TestProviders queryClient={queryClient} store={store}>
      <MemoryRouter>
        <BankSync />
      </MemoryRouter>
    </TestProviders>
  );
  render(tree());
  return { store };
}

const linkButton = () =>
  screen.queryByRole('button', { name: 'Link bank account' });
const menuButton = () => screen.queryByRole('button', { name: 'Menu' });
const providerList = () => screen.queryByRole('list', { name: 'Providers' });

async function chooseMenuItem(name: string) {
  await userEvent.click(screen.getByRole('button', { name: 'Menu' }));
  const menu = await screen.findByRole('menu');
  await userEvent.click(within(menu).getByRole('button', { name }));
}

describe('BankSync', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockProviders();
  });

  it('explains what bank sync does', () => {
    renderPage([]);

    expect(
      screen.getByText(/Bank sync downloads transactions from your bank/),
    ).toBeInTheDocument();
  });

  it('shows only the linked accounts and no link actions when the server is offline', () => {
    mockProviders({
      syncServerStatus: 'offline',
      providers: [makeProvider({ isConfigured: true })],
    });
    renderPage([linkedAccount, unlinkedAccount]);

    expect(
      screen.getByText(/The server cannot be reached/),
    ).toBeInTheDocument();
    expect(screen.getByText('Linked checking')).toBeInTheDocument();
    expect(screen.queryByText('Cash')).not.toBeInTheDocument();
    expect(linkButton()).not.toBeInTheDocument();
    expect(providerList()).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /^Link account/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Edit Linked checking' }),
    ).toBeInTheDocument();
  });

  it('shows only the message when the server is offline and nothing is linked', () => {
    mockProviders({ syncServerStatus: 'offline' });
    renderPage([unlinkedAccount]);

    expect(
      screen.getByText(/The server cannot be reached/),
    ).toBeInTheDocument();
    expect(screen.queryByText('Cash')).not.toBeInTheDocument();
    expect(menuButton()).not.toBeInTheDocument();
  });

  it('shows the provider list with regions and no menu when no provider is configured', () => {
    renderPage([unlinkedAccount]);

    expect(
      screen.getByText('Set up a provider to start linking bank accounts.'),
    ).toBeInTheDocument();
    const list = providerList() as HTMLElement;
    expect(within(list).getAllByRole('listitem')).toHaveLength(2);
    expect(within(list).getAllByText('US and Canadian banks')).toHaveLength(2);
    expect(within(list).queryByText('Not configured')).not.toBeInTheDocument();
    expect(linkButton()).not.toBeInTheDocument();
    expect(menuButton()).not.toBeInTheDocument();
    expect(screen.getByText('Cash')).toBeInTheDocument();
  });

  it('points at the link button when a provider is configured and there are no accounts', async () => {
    const provider = makeProvider({ isConfigured: true });
    mockProviders({ providers: [provider] });
    renderPage([]);

    expect(screen.getByText(/No accounts yet/)).toBeInTheDocument();
    expect(providerList()).not.toBeInTheDocument();

    await userEvent.click(linkButton() as HTMLElement);
    expect(provider.onLink).toHaveBeenCalledTimes(1);
  });

  it('shows only the toolbar and tables when accounts exist', () => {
    mockProviders({ providers: [makeProvider({ isConfigured: true })] });
    renderPage([linkedAccount, unlinkedAccount]);

    expect(linkButton()).toBeInTheDocument();
    expect(providerList()).not.toBeInTheDocument();
    expect(screen.queryByText(/No accounts yet/)).not.toBeInTheDocument();
    expect(screen.getByText('Linked checking')).toBeInTheDocument();
    expect(screen.getByText('Cash')).toBeInTheDocument();
    expect(screen.getByText('Last sync')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /^About 2 hours ago, \w{3} \d/ }),
    ).toBeInTheDocument();
  });

  it('shows the provider list above the tables when accounts are linked without a configured provider', () => {
    renderPage([linkedAccount]);

    expect(providerList()).toBeInTheDocument();
    expect(linkButton()).not.toBeInTheDocument();
    expect(screen.getByText('Linked checking')).toBeInTheDocument();
  });

  it('shows neither set up nor the no accounts message while provider status loads', () => {
    mockProviders({ isLoading: true });
    renderPage([]);

    expect(providerList()).not.toBeInTheDocument();
    expect(
      screen.queryByText('Set up a provider to start linking bank accounts.'),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/No accounts yet/)).not.toBeInTheDocument();
    expect(linkButton()).toBeDisabled();
    expect(menuButton()).not.toBeInTheDocument();
  });

  it('does not act on a partial set of provider statuses', async () => {
    const simpleFin = makeProvider({ isConfigured: true });
    const goCardless = makeProvider({
      id: 'goCardless',
      displayName: 'GoCardless',
    });
    const setProviders = mockLiveProviders({
      providers: [simpleFin, goCardless],
      isLoading: true,
    });
    renderPage([linkedAccount]);

    expect(linkButton()).toBeDisabled();
    await userEvent.click(linkButton() as HTMLElement);
    expect(simpleFin.onLink).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: 'Menu' }));
    const loadingMenu = await screen.findByRole('menu');
    expect(
      within(loadingMenu).queryByRole('button', { name: 'Providers' }),
    ).not.toBeInTheDocument();
    await userEvent.keyboard('{Escape}');

    setProviders({
      providers: [simpleFin, { ...goCardless, isConfigured: true }],
      isLoading: false,
    });

    expect(linkButton()).toBeEnabled();
    await userEvent.click(linkButton() as HTMLElement);
    expect(simpleFin.onLink).not.toHaveBeenCalled();
    const menu = await screen.findByRole('menu');
    expect(
      within(menu).getByRole('button', { name: 'GoCardless' }),
    ).toBeInTheDocument();
  });

  it('keeps the tables in place while provider status loads', () => {
    mockProviders({ isLoading: true });
    renderPage([linkedAccount]);

    expect(providerList()).not.toBeInTheDocument();
    expect(screen.getByText('Linked checking')).toBeInTheDocument();
  });

  it('says when a linked account has not synced yet', () => {
    renderPage([{ ...linkedAccount, last_sync: null }]);

    expect(screen.getByText('Not synced yet')).toBeInTheDocument();
    expect(screen.queryByText(/1970/)).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Unknown/ }),
    ).not.toBeInTheDocument();
  });

  it('reads provider state again after the providers modal reports a change', async () => {
    mockProviders({ providers: [makeProvider({ isConfigured: true })] });
    const { store } = renderPage([unlinkedAccount]);
    expect(linkButton()).toBeInTheDocument();

    await chooseMenuItem('Providers');
    const [modal] = store.getState().modals.modalStack;
    if (modal.name !== 'bank-sync-providers') {
      throw new Error('Expected the providers modal');
    }

    mockProviders({ providers: [makeProvider()] });
    const callsBefore = vi.mocked(useBuiltInBankSyncProviders).mock.calls
      .length;
    act(() => modal.options.onProvidersChange?.());

    expect(
      vi.mocked(useBuiltInBankSyncProviders).mock.calls.length,
    ).toBeGreaterThan(callsBefore);
    expect(linkButton()).not.toBeInTheDocument();
    expect(providerList()).toBeInTheDocument();
  });

  it('opens the providers and automatic syncing modals from the menu', async () => {
    mockProviders({ providers: [makeProvider({ isConfigured: true })] });
    const { store } = renderPage([linkedAccount]);

    await chooseMenuItem('Providers');
    await chooseMenuItem('Automatic syncing: never');

    expect(store.getState().modals.modalStack.map(m => m.name)).toEqual([
      'bank-sync-providers',
      'bank-sync-automatic-sync',
    ]);
  });

  it('offers automatic syncing only when an account is linked', async () => {
    mockProviders({ providers: [makeProvider({ isConfigured: true })] });
    renderPage([unlinkedAccount]);

    await userEvent.click(screen.getByRole('button', { name: 'Menu' }));
    const menu = await screen.findByRole('menu');

    expect(
      within(menu).getByRole('button', { name: 'Providers' }),
    ).toBeInTheDocument();
    expect(
      within(menu).queryByRole('button', { name: /Automatic syncing/ }),
    ).not.toBeInTheDocument();
  });

  it('shows the current interval in the automatic syncing menu item', async () => {
    mockProviders({ providers: [makeProvider({ isConfigured: true })] });
    const { store } = renderPage([linkedAccount]);
    act(() => {
      store.dispatch(mergeSyncedPrefs({ 'bank-sync-interval': '1440' }));
    });

    await userEvent.click(screen.getByRole('button', { name: 'Menu' }));
    const menu = await screen.findByRole('menu');

    expect(
      within(menu).getByRole('button', {
        name: 'Automatic syncing: every day',
      }),
    ).toBeInTheDocument();
  });

  it('names the row buttons after their account and the groups as headings', () => {
    mockProviders({ providers: [makeProvider({ isConfigured: true })] });
    renderPage([linkedAccount, unlinkedAccount]);

    expect(
      screen.getByRole('button', { name: 'Edit Linked checking' }),
    ).toHaveTextContent(/^Edit$/);
    expect(
      screen.getByRole('button', { name: 'Link account Cash' }),
    ).toHaveTextContent(/^Link account$/);
    expect(
      screen.getByRole('heading', { name: 'SimpleFIN', level: 2 }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Unlinked', level: 2 }),
    ).toBeInTheDocument();
  });
});
