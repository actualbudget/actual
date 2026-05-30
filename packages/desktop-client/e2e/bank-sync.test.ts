import type { Page } from '@playwright/test';

import { expect, test } from './fixtures';
import { ConfigurationPage } from './page-models/configuration-page';
import { Navigation } from './page-models/navigation';
import type { BankSyncPage } from './page-models/bank-sync-page';

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
});
