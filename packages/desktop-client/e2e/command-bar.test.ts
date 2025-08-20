import { type Page } from '@playwright/test';

import { expect, test } from './fixtures';
import { ConfigurationPage } from './page-models/configuration-page';

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
    expect(page.getByRole('button', { name: 'Help' })).toBeVisible(); // ensure page is loaded
  });

  test.afterAll(async () => {
    await page.close();
  });

  test('Check the command bar visuals', async () => {
    await page.keyboard.press('ControlOrMeta+k');

    const commandBarSearchBox = page.getByRole('combobox', {
      name: 'Command Bar',
    });

    expect(commandBarSearchBox).toBeVisible();

    await expect(page).toMatchThemeScreenshots();
    await page.keyboard.press('Escape');
    expect(commandBarSearchBox).not.toBeVisible();
    await expect(page).toMatchThemeScreenshots();
  });

  test('Check the command bar search works correctly', async () => {
    await page.keyboard.press('ControlOrMeta+k');

    const commandBarSearchBox = page.getByRole('combobox', {
      name: 'Command Bar',
    });

    expect(commandBarSearchBox).toBeVisible();
    await expect(commandBarSearchBox).toHaveValue('');

    // Search and navigate to reports
    await commandBarSearchBox.fill('reports');
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
