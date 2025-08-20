import { type Page } from '@playwright/test';

import { expect, test } from './fixtures';
import { ConfigurationPage } from './page-models/configuration-page';

const getCommandBar = (page: Page) =>
  page.getByRole('combobox', {
    name: 'Command Bar',
  });

test.describe('Command bar', () => {
  let page: Page;
  let configurationPage: ConfigurationPage;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    configurationPage = new ConfigurationPage(page);

    await page.goto('/');
    await configurationPage.createTestFile();

    // Move mouse to corner of the screen;
    // sometimes the mouse hovers on a budget element thus rendering an input box
    // and this breaks screenshot tests
    await page.mouse.move(0, 0);

    // ensure page is loaded
    expect(page.getByTestId('budget-table')).toBeVisible();
    expect(page.getByRole('button', { name: 'Add group' })).toBeVisible({
      timeout: 10000,
    });
  });

  test.afterAll(async () => {
    await page.close();
  });

  test('Check the command bar visuals', async () => {
    // Open the command bar
    await page.keyboard.press('ControlOrMeta+k');
    expect(getCommandBar(page)).toBeVisible();
    await expect(page).toMatchThemeScreenshots();

    // Close the command bar
    await page.keyboard.press('Escape');
    expect(getCommandBar(page)).not.toBeVisible();
    await expect(page).toMatchThemeScreenshots();
  });

  test('Check the command bar search works correctly', async () => {
    await page.keyboard.press('ControlOrMeta+k');

    expect(getCommandBar(page)).toBeVisible();
    await expect(getCommandBar(page)).toHaveValue('');

    // Search and navigate to reports
    await getCommandBar(page).fill('reports');
    await page.keyboard.press('Enter');
    expect(page.getByTestId('reports-page')).toBeVisible();
    expect(page.getByText('Loading reports...')).not.toBeVisible(); // wait for screen to load
    await expect(page).toMatchThemeScreenshots();

    // Navigate to schedule page
    await page.keyboard.press('ControlOrMeta+k');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown'); // Select second suggestion - Schedules
    await page.keyboard.press('Enter');
    expect(
      page.getByRole('button', {
        name: 'Add new schedule',
      }),
    ).toBeVisible();
    await expect(page).toMatchThemeScreenshots();
  });
});
