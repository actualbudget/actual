import { expect, test } from './fixtures';
import { ConfigurationPage } from './page-models/configuration-page';
import { type MobileBankSyncPage } from './page-models/mobile-bank-sync-page';
import { MobileNavigation } from './page-models/mobile-navigation';

test.describe('Mobile Bank Sync', () => {
  let navigation: MobileNavigation;
  let bankSyncPage: MobileBankSyncPage;
  let configurationPage: ConfigurationPage;

  test.beforeEach(async ({ page }) => {
    navigation = new MobileNavigation(page);
    configurationPage = new ConfigurationPage(page);

    await page.setViewportSize({
      width: 350,
      height: 600,
    });

    await configurationPage.createTestFile();

    bankSyncPage = await navigation.goToBankSyncPage();
  });

  test('checks the page visuals', async ({ page }) => {
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

  test('searches for accounts', async ({ page }) => {
    await bankSyncPage.searchFor('Checking');
    await expect(bankSyncPage.searchBox).toHaveValue('Checking');
    await expect(page).toMatchThemeScreenshots();
  });

  test('page handles empty state gracefully', async ({ page }) => {
    await bankSyncPage.searchFor('NonExistentAccount123456789');

    const emptyMessage = page.getByText(/No accounts found/);
    await expect(emptyMessage).toBeVisible();

    await expect(page).toMatchThemeScreenshots();
  });
});
