import type { Page } from '@playwright/test';

import { expect, test } from './fixtures';
import { ConfigurationPage } from './page-models/configuration-page';
import type { MobileBankSyncPage } from './page-models/mobile-bank-sync-page';
import { MobileNavigation } from './page-models/mobile-navigation';

test.describe('Mobile Bank Sync', () => {
  let page: Page;
  let navigation: MobileNavigation;
  let bankSyncPage: MobileBankSyncPage;
  let configurationPage: ConfigurationPage;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    navigation = new MobileNavigation(page);
    configurationPage = new ConfigurationPage(page);

    await page.setViewportSize({
      width: 350,
      height: 600,
    });

    await page.goto('/');
    await configurationPage.createTestFile();

    bankSyncPage = await navigation.goToBankSyncPage();
  });

  test.afterEach(async () => {
    await page?.close();
  });

  test('checks the page visuals', async () => {
    await bankSyncPage.waitToLoad();

    await expect(
      page.getByRole('heading', { name: 'Bank Sync' }),
    ).toBeVisible();

    await expect(bankSyncPage.searchBox).toBeVisible();
    await expect(bankSyncPage.searchBox).toHaveAttribute(
      'placeholder',
      'Filter accounts…',
    );

    await expect(page).toMatchThemeScreenshots();
  });

  test('searches for accounts', async () => {
    await bankSyncPage.searchFor('Checking');
    await expect(bankSyncPage.searchBox).toHaveValue('Checking');
    await expect(page).toMatchThemeScreenshots();
  });

  test('page handles empty state gracefully', async () => {
    await bankSyncPage.searchFor('NonExistentAccount123456789');

    const emptyMessage = page.getByText(/No accounts found/);
    await expect(emptyMessage).toBeVisible();

    await expect(page).toMatchThemeScreenshots();
  });
});
