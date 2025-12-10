import { expect, test } from './fixtures';
import { ConfigurationPage } from './page-models/configuration-page';
import { Navigation } from './page-models/navigation';
import { type SettingsPage } from './page-models/settings-page';

test.describe('Settings', () => {
  let navigation: Navigation;
  let settingsPage: SettingsPage;
  let configurationPage: ConfigurationPage;

  test.beforeEach(async ({ page }) => {
    navigation = new Navigation(page);
    configurationPage = new ConfigurationPage(page);

    await configurationPage.createTestFile();
    settingsPage = await navigation.goToSettingsPage();
  });

  test('checks the page visuals', async ({ page }) => {
    await expect(page).toMatchThemeScreenshots();
  });

  test('downloads the export of the budget', async ({ page }) => {
    const downloadPromise = page.waitForEvent('download');

    await settingsPage.exportData();

    const download = await downloadPromise;

    expect(await download.suggestedFilename()).toMatch(
      /^\d{4}-\d{2}-\d{2}-.*.zip$/,
    );
  });
});
