import { expect, test } from './fixtures';
import { ConfigurationPage } from './page-models/configuration-page';

test.describe('Command bar', () => {
  let configurationPage: ConfigurationPage;

  test.beforeEach(async ({ page }) => {
    configurationPage = new ConfigurationPage(page);

    await configurationPage.createTestFile();

    // Move mouse to corner of the screen;
    // sometimes the mouse hovers on a budget element thus rendering an input box
    // and this breaks screenshot tests
    await page.mouse.move(0, 0);

    // ensure page is loaded
    await expect(page.getByTestId('budget-table')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Add group' })).toBeVisible({
      timeout: 10000,
    });
  });

  test('Check the command bar visuals', async ({ page }) => {
    // Open the command bar
    await page.keyboard.press('ControlOrMeta+k');
    const commandBar = page.getByRole('combobox', {
      name: 'Command Bar',
    });

    await expect(commandBar).toBeVisible();
    await expect(page).toMatchThemeScreenshots();

    // Close the command bar
    await page.keyboard.press('Escape');
    await expect(commandBar).not.toBeVisible();
  });

  test('Check the command bar search works correctly', async ({ page }) => {
    await page.keyboard.press('ControlOrMeta+k');

    const commandBar = page.getByRole('combobox', {
      name: 'Command Bar',
    });

    await expect(commandBar).toBeVisible();
    await expect(commandBar).toHaveValue('');

    // Search and navigate to reports
    await commandBar.fill('reports');
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('reports-page')).toBeVisible();
    await expect(page.getByText('Loading reports...')).not.toBeVisible(); // wait for screen to load

    // Navigate to schedule page
    await page.keyboard.press('ControlOrMeta+k');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown'); // Select second suggestion - Schedules
    await expect(page).toMatchThemeScreenshots();

    await page.keyboard.press('Enter');
    await expect(
      page.getByRole('button', {
        name: 'Add new schedule',
      }),
    ).toBeVisible();
  });
});
