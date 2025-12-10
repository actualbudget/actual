import { expect, test } from './fixtures';
import { type BankSyncPage } from './page-models/bank-sync-page';
import { ConfigurationPage } from './page-models/configuration-page';
import { Navigation } from './page-models/navigation';

test.describe('Bank Sync', () => {
  let navigation: Navigation;
  let bankSyncPage: BankSyncPage;
  let configurationPage: ConfigurationPage;

  test.beforeEach(async ({ page }) => {
    navigation = new Navigation(page);
    configurationPage = new ConfigurationPage(page);

    await configurationPage.createTestFile();
    bankSyncPage = await navigation.goToBankSyncPage();
  });

  test('checks the page visuals', async ({ page }) => {
    await bankSyncPage.waitToLoad();
    await expect(page).toMatchThemeScreenshots();
  });
});
