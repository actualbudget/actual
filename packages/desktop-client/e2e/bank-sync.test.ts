import { type Page } from '@playwright/test';

import { expect, test } from './fixtures';
import { type BankSyncPage } from './page-models/bank-sync-page';
import { ConfigurationPage } from './page-models/configuration-page';
import { Navigation } from './page-models/navigation';

test.describe('Bank Sync', () => {
  let page: Page;
  let navigation: Navigation;
  let bankSyncPage: BankSyncPage;
  let configurationPage: ConfigurationPage;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    navigation = new Navigation(page);
    configurationPage = new ConfigurationPage(page);

    await page.goto('/');
    await configurationPage.createTestFile();
  });

  test.afterAll(async () => {
    await page.close();
  });

  test.beforeEach(async () => {
    bankSyncPage = await navigation.goToBankSyncPage();
  });

  test('checks the page visuals', async () => {
    await bankSyncPage.waitToLoad();
    await expect(page).toMatchThemeScreenshots();
  });
});
