import { folderProvider } from './folder';
import { googleDriveProvider } from './googleDrive';

import { backupProviders, getProvider, getSupportedProviders } from './index';

describe('backup provider registry', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete window.showDirectoryPicker;
  });

  it('lists every provider in display order', () => {
    expect(backupProviders.map(provider => provider.kind)).toEqual([
      'folder',
      'google-drive',
    ]);
  });

  it('looks providers up by kind', () => {
    expect(getProvider('folder')).toBe(folderProvider);
    expect(getProvider('google-drive')).toBe(googleDriveProvider);
  });

  it('only supports the folder when the browser has a directory picker', () => {
    expect(getSupportedProviders()).toEqual([]);

    window.showDirectoryPicker = vi.fn();
    expect(getSupportedProviders()).toEqual([folderProvider]);
  });

  it('never supports providers that are coming soon', () => {
    vi.spyOn(googleDriveProvider, 'isSupported').mockReturnValue(true);

    expect(getSupportedProviders()).not.toContain(googleDriveProvider);
  });

  it('refuses to connect a provider that is coming soon', async () => {
    await expect(
      googleDriveProvider.connect({ budgetId: 'b', budgetName: 'Budget' }),
    ).rejects.toThrow('not available yet');
    await expect(
      googleDriveProvider.restore({}, { budgetId: 'b', budgetName: 'Budget' }),
    ).resolves.toBeNull();
  });
});
