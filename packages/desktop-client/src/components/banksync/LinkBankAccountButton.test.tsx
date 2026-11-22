import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { TestProviders } from '#mocks';

import { LinkBankAccountButton } from './LinkBankAccountButton';
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

function renderButton(providers: BuiltInBankSyncProviderState[]) {
  render(
    <TestProviders>
      <LinkBankAccountButton providers={providers} />
    </TestProviders>,
  );
}

describe('LinkBankAccountButton', () => {
  it('is not shown when no provider is configured', () => {
    renderButton([makeProvider()]);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('starts the link flow directly with one configured provider', async () => {
    const configured = makeProvider({ isConfigured: true });
    const other = makeProvider({ id: 'goCardless', displayName: 'GoCardless' });
    renderButton([configured, other]);

    await userEvent.click(
      screen.getByRole('button', { name: 'Link bank account' }),
    );

    expect(configured.onLink).toHaveBeenCalledTimes(1);
    expect(other.onLink).not.toHaveBeenCalled();
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('asks which provider to use when several are configured', async () => {
    const simpleFin = makeProvider({ isConfigured: true });
    const goCardless = makeProvider({
      id: 'goCardless',
      displayName: 'GoCardless',
      isConfigured: true,
    });
    renderButton([simpleFin, goCardless]);

    await userEvent.click(
      screen.getByRole('button', { name: 'Link bank account' }),
    );
    expect(simpleFin.onLink).not.toHaveBeenCalled();

    const menu = await screen.findByRole('menu');
    await userEvent.click(
      within(menu).getByRole('button', { name: 'GoCardless' }),
    );

    expect(goCardless.onLink).toHaveBeenCalledTimes(1);
    expect(simpleFin.onLink).not.toHaveBeenCalled();
  });
});
