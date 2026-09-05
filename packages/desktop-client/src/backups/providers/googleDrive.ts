// Placeholder for backing up to Google Drive. It is listed in the settings
// UI as "coming soon" so people can see what is planned; nothing here can
// be connected yet. Replacing this stub with a real adapter means
// implementing `connect` (OAuth) and `restore` (rebuild a client from the
// stored payload) and flipping `availability` to 'available'.

import type { BackupProvider } from '#backups/types';

export const googleDriveProvider: BackupProvider = {
  kind: 'google-drive',
  availability: 'coming-soon',

  isSupported() {
    return false;
  },

  async connect() {
    throw new Error('Google Drive backups are not available yet');
  },

  async restore() {
    return null;
  },
};
