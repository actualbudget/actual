import { expect } from '@playwright/test';

import { test } from './fixtures';

test.describe('Startup errors', () => {
  test.use({ blockDocumentDir: true });

  test('shows which folder could not be used when the data folder is blocked', async ({
    electronPage,
  }) => {
    await expect(
      electronPage.getByText('Data folder unavailable'),
    ).toBeVisible();

    await expect(
      electronPage.getByText(
        "Actual couldn't access the folder where it stores your budget files:",
      ),
    ).toBeVisible();

    // The failing path is `<ACTUAL_DOCUMENT_DIR>/Actual`, where
    // ACTUAL_DOCUMENT_DIR points at a regular file named `blocked`.
    await expect(electronPage.getByText(/blocked[\\/]Actual$/)).toBeVisible();

    await expect(
      electronPage.getByRole('button', { name: 'Choose a different folder' }),
    ).toBeVisible();
    await expect(
      electronPage.getByRole('button', { name: 'Restart app' }),
    ).toBeVisible();
  });
});
