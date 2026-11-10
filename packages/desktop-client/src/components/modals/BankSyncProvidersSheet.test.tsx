import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { useBuiltInBankSyncProviders } from '#components/banksync/useBuiltInBankSyncProviders';
import type { BuiltInBankSyncProviderState } from '#components/banksync/useBuiltInBankSyncProviders';
import { TestProviders } from '#mocks';

import { BankSyncProvidersModal } from './BankSyncProvidersModal';

vi.mock('@actual-app/components/hooks/useResponsive', () => ({
  useResponsive: () => ({ isNarrowWidth: true }),
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
    onReset: vi.fn(() => Promise.resolve()),
    ...overrides,
  };
}

function renderSheet(
  providers: BuiltInBankSyncProviderState[],
  permissionWarning: 'general' | 'file-owner' | null = null,
) {
  vi.mocked(useBuiltInBankSyncProviders).mockReturnValue({
    providers,
    syncServerStatus: 'online',
    permissionWarning,
    isLoading: false,
  });
  const tree = () => (
    <TestProviders>
      <BankSyncProvidersModal />
    </TestProviders>
  );
  return render(tree());
}

const providerRow = (id: string) =>
  screen.getByTestId(`bank-sync-provider-${id}`);

describe('BankSyncProvidersModal on a narrow screen', () => {
  it('shows a region and a set up label for a provider that is not configured', async () => {
    const provider = makeProvider();
    renderSheet([provider]);

    const row = providerRow('simpleFin');
    expect(within(row).getByText('US and Canadian banks')).toBeInTheDocument();
    expect(within(row).getByText('Set up')).toBeInTheDocument();
    expect(row.querySelector('svg')).not.toBeInTheDocument();

    await userEvent.click(row);
    expect(provider.onConfigure).toHaveBeenCalledTimes(1);
  });

  it('shows the scope and a chevron for a configured provider', () => {
    renderSheet([makeProvider({ isConfigured: true })]);

    const row = providerRow('simpleFin');
    expect(
      within(row).getByText('Configured for all budgets'),
    ).toBeInTheDocument();
    expect(within(row).queryByText('Set up')).not.toBeInTheDocument();
    expect(row.querySelector('svg')).toBeInTheDocument();
  });

  it('puts the permission warning above the list', () => {
    renderSheet([makeProvider()], 'general');

    const warning = screen.getByText(/Please contact an Admin/);
    const list = screen.getByRole('list', { name: 'Providers' });
    expect(
      warning.compareDocumentPosition(list) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('opens the detail with the scope, the actions and a way back', async () => {
    const provider = makeProvider({
      isConfigured: true,
      credentialSource: 'per-budget-file',
    });
    renderSheet([provider]);

    await userEvent.click(providerRow('simpleFin'));

    expect(
      screen.getByRole('heading', { name: 'SimpleFIN' }),
    ).toBeInTheDocument();
    expect(screen.getByTestId('bank-sync-provider-scope')).toHaveTextContent(
      'Configured for this budget only',
    );
    expect(screen.getByRole('button', { name: 'All providers' })).toHaveFocus();

    await userEvent.click(
      screen.getByRole('button', { name: 'Link bank account' }),
    );
    expect(provider.onLink).toHaveBeenCalledTimes(1);
    await userEvent.click(screen.getByRole('button', { name: 'Edit setup' }));
    expect(provider.onConfigure).toHaveBeenCalledTimes(1);

    await userEvent.click(
      screen.getByRole('button', { name: 'All providers' }),
    );
    expect(
      screen.getByRole('heading', { name: 'Providers' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Providers' })).toBeInTheDocument();
  });

  it('explains an unavailable edit next to the link action, above reset', async () => {
    renderSheet([makeProvider({ isConfigured: true, canConfigure: false })]);

    await userEvent.click(providerRow('simpleFin'));

    expect(
      screen.queryByRole('button', { name: 'Edit setup' }),
    ).not.toBeInTheDocument();
    const note = screen.getByText(
      /Reset credentials before setting credentials/,
    );
    const link = screen.getByRole('button', { name: 'Link bank account' });
    const reset = screen.getByRole('button', { name: 'Reset credentials' });
    expect(
      link.compareDocumentPosition(note) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      note.compareDocumentPosition(reset) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('asks before resetting and names the scope', async () => {
    const provider = makeProvider({ isConfigured: true });
    renderSheet([provider]);

    await userEvent.click(providerRow('simpleFin'));
    await userEvent.click(
      screen.getByRole('button', { name: 'Reset credentials' }),
    );

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
    expect(screen.getByTestId('bank-sync-provider-scope')).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole('button', { name: 'Reset credentials' }),
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Reset credentials' }),
    );
    expect(provider.onReset).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('list', { name: 'Providers' })).toBeInTheDocument();
  });

  it('starts at the list each time it opens', async () => {
    const providers = [makeProvider({ isConfigured: true })];
    const { unmount } = renderSheet(providers);

    await userEvent.click(providerRow('simpleFin'));
    expect(screen.getByTestId('bank-sync-provider-scope')).toBeInTheDocument();
    unmount();

    renderSheet(providers);
    expect(screen.getByRole('list', { name: 'Providers' })).toBeInTheDocument();
    expect(
      screen.queryByTestId('bank-sync-provider-scope'),
    ).not.toBeInTheDocument();
  });
});
