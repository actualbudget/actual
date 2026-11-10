import { useState } from 'react';
import { MemoryRouter } from 'react-router';

import { generateAccount } from '@actual-app/core/mocks';
import type { AccountEntity } from '@actual-app/core/types/models';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { accountQueries } from '#accounts';
import { useBuiltInBankSyncProviders } from '#components/banksync/useBuiltInBankSyncProviders';
import type { BuiltInBankSyncProviderState } from '#components/banksync/useBuiltInBankSyncProviders';
import { useNavigate } from '#hooks/useNavigate';
import {
  configureTestAppStore,
  createTestQueryClient,
  TestProviders,
} from '#mocks';

import { MobileBankSyncPage } from './MobileBankSyncPage';

vi.mock('@use-gesture/react', () => ({
  useDrag: vi.fn().mockReturnValue(() => ({})),
}));
vi.mock('@actual-app/components/hooks/useResponsive', () => ({
  useResponsive: () => ({ isNarrowWidth: true }),
}));
vi.mock('#hooks/useNavigate');
vi.mock('#components/banksync/useBuiltInBankSyncProviders', () => ({
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
const neverSyncedAccount: AccountEntity = {
  ...generateAccount('New savings', true),
  id: 'never-synced',
  bankName: 'Test Bank',
  account_sync_source: 'simpleFin',
  last_sync: null,
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

const mockNavigate = vi.fn();

function renderPage(accounts: AccountEntity[]) {
  const queryClient = createTestQueryClient();
  const store = configureTestAppStore({ queryClient });
  queryClient.setQueryData(accountQueries.list().queryKey, accounts);
  const tree = () => (
    <TestProviders queryClient={queryClient} store={store}>
      <MemoryRouter>
        <MobileBankSyncPage />
      </MemoryRouter>
    </TestProviders>
  );
  render(tree());
  return { store };
}

const addButton = () =>
  screen.queryByRole('button', { name: 'Link bank account' });
const menuButton = () =>
  screen.queryByRole('button', { name: 'Bank sync menu' });
const providerList = () => screen.queryByRole('list', { name: 'Providers' });
const searchBox = () => screen.queryByPlaceholderText(/Filter accounts/);

describe('MobileBankSyncPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(useNavigate).mockReturnValue(mockNavigate);
    mockProviders();
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
    expect(screen.getByRole('row', { name: /Linked checking/ })).toBeVisible();
    expect(screen.queryByText('Cash')).not.toBeInTheDocument();
    expect(screen.queryByText('Link account')).not.toBeInTheDocument();
    expect(addButton()).not.toBeInTheDocument();
    expect(providerList()).not.toBeInTheDocument();
  });

  it('shows only the message when the server is offline and nothing is linked', () => {
    mockProviders({ syncServerStatus: 'offline' });
    renderPage([unlinkedAccount]);

    expect(
      screen.getByText(/The server cannot be reached/),
    ).toBeInTheDocument();
    expect(menuButton()).not.toBeInTheDocument();
    expect(addButton()).not.toBeInTheDocument();
    expect(searchBox()).not.toBeInTheDocument();
  });

  it('shows the provider list with regions and no header actions when no provider is configured', async () => {
    const provider = makeProvider();
    mockProviders({ providers: [provider] });
    renderPage([]);

    expect(
      screen.getByText('Set up a provider to start linking bank accounts.'),
    ).toBeInTheDocument();
    const list = providerList() as HTMLElement;
    expect(within(list).getAllByRole('listitem')).toHaveLength(1);
    expect(within(list).getByText('US and Canadian banks')).toBeInTheDocument();
    expect(within(list).getByText('Set up')).toBeInTheDocument();
    expect(within(list).queryByText('Not configured')).not.toBeInTheDocument();
    expect(menuButton()).not.toBeInTheDocument();
    expect(addButton()).not.toBeInTheDocument();

    await userEvent.click(within(list).getByRole('button'));
    expect(provider.onConfigure).toHaveBeenCalledTimes(1);
  });

  it('offers a link button in the body when a provider is configured and there are no accounts', async () => {
    const provider = makeProvider({ isConfigured: true });
    mockProviders({ providers: [provider] });
    renderPage([]);

    expect(screen.getByText(/No accounts yet/)).toBeInTheDocument();
    expect(screen.queryByText(/Open the menu/)).not.toBeInTheDocument();
    expect(providerList()).not.toBeInTheDocument();
    expect(searchBox()).not.toBeInTheDocument();

    const buttons = screen.getAllByRole('button', {
      name: 'Link bank account',
    });
    expect(buttons).toHaveLength(2);
    await userEvent.click(buttons[1]);
    expect(provider.onLink).toHaveBeenCalledTimes(1);
  });

  it('starts the link flow from the header with one configured provider', async () => {
    const provider = makeProvider({ isConfigured: true });
    mockProviders({ providers: [provider, makeProvider({ id: 'akahu' })] });
    const { store } = renderPage([linkedAccount]);

    await userEvent.click(addButton() as HTMLElement);

    expect(provider.onLink).toHaveBeenCalledTimes(1);
    expect(store.getState().modals.modalStack).toEqual([]);
  });

  it('asks which provider to use from the header when several are configured', async () => {
    const simpleFin = makeProvider({ isConfigured: true });
    const goCardless = makeProvider({
      id: 'goCardless',
      displayName: 'GoCardless',
      isConfigured: true,
    });
    mockProviders({ providers: [simpleFin, goCardless] });
    const { store } = renderPage([linkedAccount]);

    await userEvent.click(addButton() as HTMLElement);

    expect(simpleFin.onLink).not.toHaveBeenCalled();
    expect(store.getState().modals.modalStack).toMatchObject([
      {
        name: 'bank-sync-link-provider',
        options: {
          linkProviders: [
            { id: 'simpleFin', displayName: 'SimpleFIN' },
            { id: 'goCardless', displayName: 'GoCardless' },
          ],
        },
      },
    ]);
  });

  it('shows only the search and the list when accounts exist', () => {
    mockProviders({ providers: [makeProvider({ isConfigured: true })] });
    renderPage([linkedAccount, unlinkedAccount]);

    expect(searchBox()).toBeInTheDocument();
    expect(providerList()).not.toBeInTheDocument();
    expect(screen.queryByText(/No accounts yet/)).not.toBeInTheDocument();
    expect(screen.getByRole('grid', { name: 'SimpleFIN' })).toBeInTheDocument();
    expect(screen.getByRole('grid', { name: 'Unlinked' })).toBeInTheDocument();
  });

  it('names a single group of accounts', () => {
    renderPage([unlinkedAccount]);

    expect(screen.getByRole('grid', { name: 'Accounts' })).toBeInTheDocument();
    expect(screen.queryByText('Unlinked')).not.toBeInTheDocument();
  });

  it('shows when a linked account last synced', () => {
    renderPage([linkedAccount]);

    const row = screen.getByRole('row', { name: /Linked checking/ });
    expect(
      within(row).getByText('Synced about 2 hours ago'),
    ).toBeInTheDocument();
    expect(within(row).getByText('Test Bank')).toBeInTheDocument();
    expect(row).toHaveAccessibleName(
      /^Linked checking, Test Bank, synced \w{3} \d{1,2}, \d{4}, \d{2}:\d{2}:\d{2}$/,
    );
  });

  it('says when a linked account has not synced yet', () => {
    renderPage([neverSyncedAccount]);

    const row = screen.getByRole('row', { name: /New savings/ });
    expect(within(row).getByText('Not synced yet')).toBeInTheDocument();
    expect(within(row).queryByText(/^Synced/)).not.toBeInTheDocument();
  });

  it('shows no sync line for an unlinked account', () => {
    renderPage([unlinkedAccount]);

    const row = screen.getByRole('row', { name: /Cash/ });
    expect(within(row).getByText('Link account')).toBeInTheDocument();
    expect(within(row).queryByText(/^Synced/)).not.toBeInTheDocument();
    expect(within(row).queryByText('Not synced yet')).not.toBeInTheDocument();
  });

  it('opens the edit page when a linked account is pressed', async () => {
    renderPage([linkedAccount]);

    await userEvent.click(
      within(screen.getByRole('row', { name: /Linked checking/ })).getByRole(
        'button',
      ),
    );

    expect(mockNavigate).toHaveBeenCalledWith('/bank-sync/account/linked/edit');
  });

  it('starts linking when an unlinked account is pressed', async () => {
    const { store } = renderPage([unlinkedAccount]);

    await userEvent.click(
      within(screen.getByRole('row', { name: /Cash/ })).getByRole('button'),
    );

    expect(store.getState().modals.modalStack).toEqual([
      { name: 'add-account', options: { upgradingAccountId: 'unlinked' } },
    ]);
  });

  it('filters accounts by name', async () => {
    renderPage([linkedAccount, unlinkedAccount]);

    await userEvent.type(searchBox() as HTMLElement, 'cash');

    expect(screen.getByText('Cash')).toBeInTheDocument();
    expect(screen.queryByText('Linked checking')).not.toBeInTheDocument();

    await userEvent.type(searchBox() as HTMLElement, ' nothing');
    expect(
      screen.getByText('No accounts found matching your search.'),
    ).toBeInTheDocument();
  });

  it('shows neither set up nor the no accounts message while provider status loads', () => {
    mockProviders({ isLoading: true });
    renderPage([]);

    expect(providerList()).not.toBeInTheDocument();
    expect(
      screen.queryByText('Set up a provider to start linking bank accounts.'),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/No accounts yet/)).not.toBeInTheDocument();
    expect(addButton()).toBeDisabled();
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
    const { store } = renderPage([linkedAccount]);

    expect(addButton()).toBeDisabled();
    await userEvent.click(menuButton() as HTMLElement);
    expect(store.getState().modals.modalStack).toMatchObject([
      { name: 'bank-sync-menu', options: { hasProvidersItem: false } },
    ]);

    setProviders({
      providers: [simpleFin, { ...goCardless, isConfigured: true }],
      isLoading: false,
    });

    expect(addButton()).toBeEnabled();
    await userEvent.click(addButton() as HTMLElement);
    expect(simpleFin.onLink).not.toHaveBeenCalled();
    expect(store.getState().modals.modalStack.at(-1)).toMatchObject({
      name: 'bank-sync-link-provider',
    });
  });

  it('reads provider state again and keeps the filter after the providers sheet reports a change', async () => {
    const { store } = renderPage([linkedAccount, unlinkedAccount]);
    expect(providerList()).toBeInTheDocument();

    await userEvent.type(searchBox() as HTMLElement, 'cash');
    await userEvent.click(menuButton() as HTMLElement);
    const [modal] = store.getState().modals.modalStack;
    if (modal.name !== 'bank-sync-menu') {
      throw new Error('Expected the bank sync menu');
    }

    mockProviders({ providers: [makeProvider({ isConfigured: true })] });
    const callsBefore = vi.mocked(useBuiltInBankSyncProviders).mock.calls
      .length;
    act(() => modal.options.onProvidersChange?.());

    expect(
      vi.mocked(useBuiltInBankSyncProviders).mock.calls.length,
    ).toBeGreaterThan(callsBefore);
    expect(providerList()).not.toBeInTheDocument();
    expect(searchBox()).toHaveValue('cash');
    expect(screen.getByText('Cash')).toBeInTheDocument();
    expect(screen.queryByText('Linked checking')).not.toBeInTheDocument();
  });

  it('opens the menu sheet with providers and automatic syncing only', async () => {
    mockProviders({ providers: [makeProvider({ isConfigured: true })] });
    const { store } = renderPage([linkedAccount]);

    await userEvent.click(menuButton() as HTMLElement);

    const [modal] = store.getState().modals.modalStack;
    expect(modal).toMatchObject({
      name: 'bank-sync-menu',
      options: { hasProvidersItem: true, hasAutomaticSyncItem: true },
    });
    expect(modal).not.toHaveProperty('options.linkProviders');
  });

  it('leaves automatic syncing out of the menu until an account is linked', async () => {
    mockProviders({ providers: [makeProvider({ isConfigured: true })] });
    const { store } = renderPage([unlinkedAccount]);

    await userEvent.click(menuButton() as HTMLElement);

    const [modal] = store.getState().modals.modalStack;
    expect(modal).toMatchObject({
      name: 'bank-sync-menu',
      options: { hasProvidersItem: true, hasAutomaticSyncItem: false },
    });
  });

  it('uses headings for the provider groups', () => {
    mockProviders({ providers: [makeProvider({ isConfigured: true })] });
    renderPage([linkedAccount, unlinkedAccount]);

    expect(
      screen.getByRole('heading', { name: 'SimpleFIN', level: 2 }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Unlinked', level: 2 }),
    ).toBeInTheDocument();
  });
});
