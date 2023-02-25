import { test, expect } from '@playwright/test';

import { ConfigurationPage } from './page-models/configuration-page';
import { Navigation } from './page-models/navigation';

test.describe('Settings', () => {
  let page;
  let navigation;
  let settingsPage;
  let configurationPage;

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
    settingsPage = await navigation.goToSettingsPage();
  });

  test('downloads the export of the budget', async () => {
    const downloadPromise = page.waitForEvent('download');

    await settingsPage.exportData();

    const download = await downloadPromise;

    expect(await download.suggestedFilename()).toMatch(
      /^\d{4}-\d{2}-\d{2}-.*.zip$/,
    );
  });
});
