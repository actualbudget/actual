import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { useBuiltInBankSyncProviders } from '#components/banksync/useBuiltInBankSyncProviders';
import type { BuiltInBankSyncProviderState } from '#components/banksync/useBuiltInBankSyncProviders';
import { useSyncedPref } from '#hooks/useSyncedPref';
import { TestProviders } from '#mocks';

import { BankSyncAutomaticSyncModal } from './BankSyncAutomaticSyncModal';
import { BankSyncProvidersModal } from './BankSyncProvidersModal';

vi.mock('#components/banksync/useBuiltInBankSyncProviders', () => ({
  useBuiltInBankSyncProviders: vi.fn(),
}));
vi.mock('#hooks/useSyncedPref', () => ({
  useSyncedPref: vi.fn(),
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

function mockProviders(providers: BuiltInBankSyncProviderState[]) {
  vi.mocked(useBuiltInBankSyncProviders).mockReturnValue({
    providers,
    syncServerStatus: 'online',
    permissionWarning: null,
    isLoading: false,
  });
}

function renderProvidersModal(providers: BuiltInBankSyncProviderState[]) {
  mockProviders(providers);
  const onProvidersChange = vi.fn();
  const modal = () => (
    <TestProviders>
      <BankSyncProvidersModal onProvidersChange={onProvidersChange} />
    </TestProviders>
  );
  const { unmount, rerender } = render(modal());
  return {
    onProvidersChange,
    unmount,
    update: (nextProviders: BuiltInBankSyncProviderState[]) => {
      mockProviders(nextProviders);
      rerender(modal());
    },
  };
}

async function openResetConfirmation() {
  await userEvent.click(screen.getByRole('button', { name: 'SimpleFIN menu' }));
  await userEvent.click(
    await screen.findByRole('button', { name: 'Reset credentials' }),
  );
}

async function resetCredentials() {
  await openResetConfirmation();
  await userEvent.click(
    await screen.findByRole('button', { name: 'Reset credentials' }),
  );
}

describe('BankSyncProvidersModal', () => {
  it('lists the providers under a Providers title', () => {
    renderProvidersModal([
      makeProvider(),
      makeProvider({ id: 'goCardless', displayName: 'GoCardless' }),
    ]);

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Providers')).toBeInTheDocument();
    expect(
      within(
        within(dialog).getByRole('list', { name: 'Providers' }),
      ).getAllByRole('listitem'),
    ).toHaveLength(2);
  });

  it('names the dialog after its title', () => {
    renderProvidersModal([makeProvider()]);

    expect(screen.getByRole('dialog', { name: 'Providers' })).toBeVisible();
  });

  it('asks before resetting and names the scope', async () => {
    const provider = makeProvider({ isConfigured: true });
    renderProvidersModal([provider]);

    await openResetConfirmation();

    expect(provider.onReset).not.toHaveBeenCalled();
    expect(
      screen.getByText('Reset SimpleFIN credentials?'),
    ).toBeInTheDocument();
    expect(
      screen.getAllByText(/credentials for all budgets on this server/)[0],
    ).toBeVisible();
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(provider.onReset).not.toHaveBeenCalled();
    expect(screen.getByRole('list', { name: 'Providers' })).toBeInTheDocument();
  });

  it('says this budget only when resetting per budget credentials', async () => {
    renderProvidersModal([
      makeProvider({ isConfigured: true, credentialSource: 'per-budget-file' }),
    ]);

    await openResetConfirmation();

    expect(
      screen.getAllByText(/credentials saved for this budget only/)[0],
    ).toBeVisible();
  });

  it('does not report a change when nothing was set up or reset', () => {
    const { onProvidersChange, unmount } = renderProvidersModal([
      makeProvider(),
    ]);

    unmount();

    expect(onProvidersChange).not.toHaveBeenCalled();
  });

  it('does not report a change when a set up is cancelled', async () => {
    const provider = makeProvider();
    const { onProvidersChange, unmount } = renderProvidersModal([provider]);

    await userEvent.click(
      screen.getByRole('button', { name: 'Set up SimpleFIN' }),
    );
    expect(provider.onConfigure).toHaveBeenCalledTimes(1);

    unmount();

    expect(onProvidersChange).not.toHaveBeenCalled();
  });

  it('reports a change on close after a set up succeeds', async () => {
    const { onProvidersChange, unmount, update } = renderProvidersModal([
      makeProvider(),
    ]);

    await userEvent.click(
      screen.getByRole('button', { name: 'Set up SimpleFIN' }),
    );
    update([makeProvider({ isConfigured: true })]);
    expect(onProvidersChange).not.toHaveBeenCalled();

    unmount();

    expect(onProvidersChange).toHaveBeenCalledTimes(1);
  });

  it('reports a change on close after a reset completes', async () => {
    const { onProvidersChange, unmount, update } = renderProvidersModal([
      makeProvider({
        isConfigured: true,
        onReset: vi.fn(() => Promise.resolve()),
      }),
    ]);

    await resetCredentials();
    update([makeProvider()]);
    expect(onProvidersChange).not.toHaveBeenCalled();

    unmount();

    expect(onProvidersChange).toHaveBeenCalledTimes(1);
  });

  it('waits for a reset that is still running when the modal closes', async () => {
    const resolvers: Array<() => void> = [];
    const onReset = vi.fn(
      () =>
        new Promise<void>(resolve => {
          resolvers.push(resolve);
        }),
    );
    const { onProvidersChange, unmount } = renderProvidersModal([
      makeProvider({ isConfigured: true, onReset }),
    ]);

    await resetCredentials();
    expect(onReset).toHaveBeenCalledTimes(1);

    unmount();
    expect(onProvidersChange).not.toHaveBeenCalled();

    resolvers.forEach(resolve => resolve());
    await vi.waitFor(() => expect(onProvidersChange).toHaveBeenCalledTimes(1));
  });
});

describe('BankSyncAutomaticSyncModal', () => {
  it('shows the interval settings under an Automatic syncing title', () => {
    vi.mocked(useSyncedPref).mockReturnValue(['1440', vi.fn()]);
    render(
      <TestProviders>
        <BankSyncAutomaticSyncModal />
      </TestProviders>,
    );

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Automatic syncing')).toBeInTheDocument();
    expect(dialog).toHaveAccessibleName('Automatic syncing');
    expect(within(dialog).getByLabelText('Sync accounts')).toHaveTextContent(
      'Every day',
    );
  });
});
