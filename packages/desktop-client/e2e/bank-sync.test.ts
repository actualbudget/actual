import type { Page } from '@playwright/test';

import { expect, test } from './fixtures';
import type { BankSyncPage } from './page-models/bank-sync-page';
import { ConfigurationPage } from './page-models/configuration-page';
import { Navigation } from './page-models/navigation';

test.describe('Bank Sync', () => {
  let page: Page;
  let navigation: Navigation;
  let bankSyncPage: BankSyncPage;
  let configurationPage: ConfigurationPage;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    navigation = new Navigation(page);
    configurationPage = new ConfigurationPage(page);

    await page.goto('/');
    await configurationPage.createTestFile();

    bankSyncPage = await navigation.goToBankSyncPage();
  });

  test.afterEach(async () => {
    await page?.close();
  });

  test('checks the page visuals', async () => {
    await bankSyncPage.waitToLoad();
    await expect(page).toMatchThemeScreenshots();
  });

  test('shows provider setup in disabled state when no server is configured', async () => {
    console.log(
      '[bank-sync] verifying provider setup UI is visible but disabled when no server is connected',
    );
    await expect(bankSyncPage.providersHeading).toBeVisible();
    await expect(bankSyncPage.disabledSetupButton).toBeDisabled();
    await expect(bankSyncPage.disabledSetupButton).toContainText(
      'Set up bank sync',
    );
    await expect(
      page.getByText('Connect to an Actual server to set up', { exact: false }),
    ).toBeVisible();
    console.log(
      '[bank-sync] providers heading visible, "Set up bank sync" button disabled, server warning shown',
    );
  });

  test('shows accounts available to link when no server is configured', async () => {
    await bankSyncPage.waitToLoad();
    await expect(
      page.getByRole('button', { name: 'Link account' }).first(),
    ).toBeVisible();
    const linkButtons = page.getByRole('button', { name: 'Link account' });
    const linkButtonCount = await linkButtons.count();
    console.log(
      `[bank-sync] ${linkButtonCount} "Link account" buttons visible — accounts are listed even without a server`,
    );
    expect(linkButtonCount).toBeGreaterThan(1);
  });
});
