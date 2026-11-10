import { useState } from 'react';

import { generateAccount } from '@actual-app/core/mocks';
import type { AccountEntity } from '@actual-app/core/types/models';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { accountQueries } from '#accounts';
import { useBuiltInBankSyncProviders } from '#components/banksync/useBuiltInBankSyncProviders';
import type { BuiltInBankSyncProviderState } from '#components/banksync/useBuiltInBankSyncProviders';
import { useSyncServerStatus } from '#hooks/useSyncServerStatus';
import {
  configureTestAppStore,
  createTestQueryClient,
  TestProviders,
} from '#mocks';

import { CreateAccountModal } from './CreateAccountModal';

vi.mock('#hooks/useNavigate');
vi.mock('#hooks/useSyncServerStatus', () => ({
  useSyncServerStatus: vi.fn(),
}));
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

const account: AccountEntity = { ...generateAccount('Cash'), id: 'cash' };

type ProvidersState = ReturnType<typeof useBuiltInBankSyncProviders>;

function renderModal(
  state: Partial<ProvidersState>,
  upgradingAccountId: string | null = account.id,
) {
  let rerenderHook: () => void = () => undefined;
  let currentState: ProvidersState = {
    providers: [],
    syncServerStatus: 'online',
    permissionWarning: null,
    isLoading: false,
    ...state,
  };
  vi.mocked(useBuiltInBankSyncProviders).mockImplementation(() => {
    const [, setTick] = useState(0);
    rerenderHook = () => setTick(tick => tick + 1);
    return currentState;
  });
  vi.mocked(useSyncServerStatus).mockReturnValue(currentState.syncServerStatus);
  const queryClient = createTestQueryClient();
  const store = configureTestAppStore({ queryClient });
  queryClient.setQueryData(accountQueries.list().queryKey, [account]);
  render(
    <TestProviders queryClient={queryClient} store={store}>
      <CreateAccountModal
        upgradingAccountId={upgradingAccountId ?? undefined}
      />
    </TestProviders>,
  );
  return {
    update: (nextState: Partial<ProvidersState>) => {
      currentState = { ...currentState, ...nextState };
      act(() => rerenderHook());
    },
  };
}

describe('linking an existing account', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('names the account and offers one action per provider', async () => {
    const simpleFin = makeProvider({ isConfigured: true });
    const goCardless = makeProvider({
      id: 'goCardless',
      displayName: 'GoCardless',
      region: 'European banks',
      isConfigured: true,
    });
    const akahu = makeProvider({
      id: 'akahu',
      displayName: 'Akahu',
      region: 'New Zealand banks',
    });
    renderModal({ providers: [simpleFin, goCardless, akahu] });

    expect(screen.getByRole('dialog', { name: 'Link Cash' })).toBeVisible();
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
    expect(screen.getByText('European banks')).toBeInTheDocument();
    expect(screen.queryByText(/Configured/)).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Edit setup/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /menu|Reset/ }),
    ).not.toBeInTheDocument();
    expect(simpleFin.onLink).not.toHaveBeenCalled();

    await userEvent.click(
      screen.getByRole('button', { name: 'Link with GoCardless' }),
    );
    expect(goCardless.onLink).toHaveBeenCalledTimes(1);
    expect(simpleFin.onLink).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: 'Set up Akahu' }));
    expect(akahu.onConfigure).toHaveBeenCalledTimes(1);
  });

  it('starts the only configured provider without asking', () => {
    const simpleFin = makeProvider({ isConfigured: true });
    const akahu = makeProvider({ id: 'akahu', displayName: 'Akahu' });
    renderModal({ providers: [simpleFin, akahu] });

    expect(simpleFin.onLink).toHaveBeenCalledTimes(1);
    expect(akahu.onLink).not.toHaveBeenCalled();
  });

  it('waits for provider status before starting the only provider', () => {
    const simpleFin = makeProvider({ isConfigured: true });
    const { update } = renderModal({ providers: [simpleFin], isLoading: true });

    expect(simpleFin.onLink).not.toHaveBeenCalled();

    update({ isLoading: false });
    expect(simpleFin.onLink).toHaveBeenCalledTimes(1);

    update({ providers: [{ ...simpleFin }] });
    expect(simpleFin.onLink).toHaveBeenCalledTimes(1);
  });

  it('does not start a provider after the server was offline while open', () => {
    const goCardless = makeProvider({
      id: 'goCardless',
      displayName: 'GoCardless',
      isConfigured: true,
    });
    const { update } = renderModal({
      providers: [goCardless],
      syncServerStatus: 'offline',
    });

    update({ syncServerStatus: 'online' });

    expect(goCardless.onLink).not.toHaveBeenCalled();
    expect(
      screen.getByRole('button', { name: 'Link with GoCardless' }),
    ).toBeInTheDocument();
  });

  it('returns to the chooser after the first provider is set up from it', async () => {
    const simpleFin = makeProvider();
    const { update } = renderModal({ providers: [simpleFin] });

    await userEvent.click(
      screen.getByRole('button', { name: 'Set up SimpleFIN' }),
    );
    update({ providers: [{ ...simpleFin, isConfigured: true }] });

    expect(simpleFin.onLink).not.toHaveBeenCalled();
    expect(
      screen.getByRole('button', { name: 'Link with SimpleFIN' }),
    ).toBeInTheDocument();
  });

  it('describes each provider row with its region', () => {
    renderModal({
      providers: [
        makeProvider({ isConfigured: true }),
        makeProvider({
          id: 'akahu',
          displayName: 'Akahu',
          region: 'New Zealand banks',
          isConfigured: true,
        }),
      ],
    });

    expect(
      screen.getByRole('button', { name: 'Link with Akahu' }),
    ).toHaveAccessibleDescription('New Zealand banks');
  });

  it('offers set up only when no provider is configured', () => {
    const simpleFin = makeProvider();
    renderModal({ providers: [simpleFin] });

    expect(
      screen.getByRole('button', { name: 'Set up SimpleFIN' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Link with/ }),
    ).not.toBeInTheDocument();
    expect(simpleFin.onLink).not.toHaveBeenCalled();
  });

  it('says a server is needed when there is none', () => {
    renderModal({
      providers: [makeProvider({ isConfigured: true })],
      syncServerStatus: 'no-server',
    });

    expect(
      screen.getByText(/Bank sync needs an Actual server/),
    ).toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });
});

describe('adding an account', () => {
  it('keeps the local account and bank sync choices', () => {
    renderModal({ providers: [makeProvider()] }, null);

    expect(
      screen.getByRole('button', { name: 'Create a local account' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Set up bank sync' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });
});
