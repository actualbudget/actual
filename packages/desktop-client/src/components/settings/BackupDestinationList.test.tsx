import React from 'react';

import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { BackupProvider } from '#backups';

import { BackupDestinationList } from './BackupDestinationList';

function createProvider(
  overrides: Partial<BackupProvider> & Pick<BackupProvider, 'kind'>,
): BackupProvider {
  return {
    availability: 'available',
    isSupported: () => true,
    connect: async () => null,
    restore: async () => null,
    ...overrides,
  };
}

const folder = createProvider({ kind: 'folder' });
const googleDrive = createProvider({
  kind: 'google-drive',
  availability: 'coming-soon',
  isSupported: () => false,
});

describe('BackupDestinationList', () => {
  it('offers a connect button for supported providers', async () => {
    const onConnect = vi.fn();
    render(
      <BackupDestinationList
        providers={[folder, googleDrive]}
        connectedKind={null}
        connectedLabel={null}
        onConnect={onConnect}
      />,
    );

    const row = screen.getByTestId('backup-destination-folder');
    const button = within(row).getByRole('button', {
      name: 'Choose backup folder',
    });
    await userEvent.click(button);

    expect(onConnect).toHaveBeenCalledWith('folder');
  });

  it('marks providers that are coming soon and offers no button', () => {
    render(
      <BackupDestinationList
        providers={[folder, googleDrive]}
        connectedKind={null}
        connectedLabel={null}
        onConnect={vi.fn()}
      />,
    );

    const row = screen.getByTestId('backup-destination-google-drive');
    expect(within(row).getByText('Google Drive')).toBeInTheDocument();
    expect(within(row).getByText('Coming soon')).toBeInTheDocument();
    expect(
      within(row).getByText('This option is not available yet.'),
    ).toBeInTheDocument();
    expect(within(row).queryByRole('button')).not.toBeInTheDocument();
  });

  it('offers no button for unsupported providers and explains why', () => {
    const unsupportedFolder = createProvider({
      kind: 'folder',
      isSupported: () => false,
    });
    render(
      <BackupDestinationList
        providers={[unsupportedFolder]}
        connectedKind={null}
        connectedLabel={null}
        onConnect={vi.fn()}
      />,
    );

    const row = screen.getByTestId('backup-destination-folder');
    expect(within(row).queryByRole('button')).not.toBeInTheDocument();
    expect(
      within(row).getByText(/Not supported in this browser/),
    ).toBeInTheDocument();
  });

  it('shows the connected provider with its label and a change button', () => {
    render(
      <BackupDestinationList
        providers={[folder, googleDrive]}
        connectedKind="folder"
        connectedLabel="Backups"
        onConnect={vi.fn()}
      />,
    );

    const row = screen.getByTestId('backup-destination-folder');
    expect(within(row).getByText('Connected: Backups')).toBeInTheDocument();
    expect(
      within(row).getByRole('button', { name: 'Change folder' }),
    ).toBeInTheDocument();
  });
});
