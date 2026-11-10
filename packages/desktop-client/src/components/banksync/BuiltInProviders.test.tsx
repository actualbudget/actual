import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { TestProviders } from '#mocks';

import { BuiltInProviders } from './BuiltInProviders';
import type { BuiltInBankSyncProviderState } from './useBuiltInBankSyncProviders';

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

function renderProviders(
  providers: BuiltInBankSyncProviderState[],
  syncServerStatus: 'offline' | 'no-server' | 'online' = 'online',
  permissionWarning: 'general' | 'file-owner' | null = null,
) {
  render(
    <TestProviders>
      <BuiltInProviders
        providers={providers}
        syncServerStatus={syncServerStatus}
        permissionWarning={permissionWarning}
      />
    </TestProviders>,
  );
}

describe('BuiltInProviders', () => {
  it('lists every provider as a row', () => {
    renderProviders([
      makeProvider(),
      makeProvider({ id: 'goCardless', displayName: 'GoCardless' }),
    ]);

    const list = screen.getByRole('list', { name: 'Providers' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(2);
  });

  it('offers only set up for a provider that is not configured', async () => {
    const provider = makeProvider();
    renderProviders([provider]);

    const row = screen.getByTestId('bank-sync-provider-simpleFin');
    expect(within(row).getByText('US and Canadian banks')).toBeInTheDocument();
    expect(
      within(row).queryByRole('button', { name: /Link bank account/ }),
    ).not.toBeInTheDocument();
    expect(
      within(row).queryByRole('button', { name: 'SimpleFIN menu' }),
    ).not.toBeInTheDocument();

    await userEvent.click(
      within(row).getByRole('button', { name: 'Set up SimpleFIN' }),
    );
    expect(provider.onConfigure).toHaveBeenCalledTimes(1);
  });

  it('shows status, scope and actions for a configured provider', async () => {
    const provider = makeProvider({
      isConfigured: true,
      credentialSource: 'per-budget-file',
    });
    renderProviders([provider]);

    const row = screen.getByTestId('bank-sync-provider-simpleFin');
    expect(
      within(row).getByText('Configured for this budget only'),
    ).toBeInTheDocument();
    expect(
      within(row).queryByText('US and Canadian banks'),
    ).not.toBeInTheDocument();

    await userEvent.click(
      within(row).getByRole('button', {
        name: 'Link bank account with SimpleFIN',
      }),
    );
    expect(provider.onLink).toHaveBeenCalledTimes(1);

    await userEvent.click(
      within(row).getByRole('button', { name: 'Edit setup for SimpleFIN' }),
    );
    expect(provider.onConfigure).toHaveBeenCalledTimes(1);
  });

  it('resets credentials from the provider menu', async () => {
    const provider = makeProvider({ isConfigured: true });
    renderProviders([provider]);

    await userEvent.click(
      screen.getByRole('button', { name: 'SimpleFIN menu' }),
    );
    await userEvent.click(
      await screen.findByRole('button', {
        name: 'Reset credentials',
      }),
    );
    expect(provider.onReset).toHaveBeenCalledTimes(1);
  });

  it('keeps the permission warning and the reset note', () => {
    renderProviders(
      [
        makeProvider({
          isConfigured: true,
          credentialSource: 'global',
          canConfigure: false,
        }),
      ],
      'online',
      'general',
    );

    expect(
      screen.getByText(/Reset credentials before setting credentials/),
    ).toBeInTheDocument();
    expect(screen.getByText(/Please contact an Admin/)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Edit setup for SimpleFIN' }),
    ).toBeDisabled();
  });

  it('says all budgets for a provider configured globally', () => {
    renderProviders([makeProvider({ isConfigured: true })]);

    expect(screen.getByText('Configured for all budgets')).toBeInTheDocument();
  });

  it('puts the permission warning above the list it explains', () => {
    renderProviders([makeProvider()], 'online', 'general');

    const warning = screen.getByText(/Please contact an Admin/);
    const list = screen.getByRole('list', { name: 'Providers' });
    expect(
      warning.compareDocumentPosition(list) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it.each([
    ['no-server', /Bank sync needs an Actual server/],
    ['offline', /The server cannot be reached/],
  ] as const)(
    'shows a message instead of the list when the server is %s',
    (syncServerStatus, message) => {
      renderProviders([makeProvider()], syncServerStatus);

      expect(screen.getByText(message)).toBeInTheDocument();
      expect(screen.queryByRole('list')).not.toBeInTheDocument();
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    },
  );
});
