import type { Page } from '@playwright/test';

import { expect, test } from './fixtures';
import { ConfigurationPage } from './page-models/configuration-page';

test.describe('Command bar', () => {
  let page: Page;
  let configurationPage: ConfigurationPage;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    configurationPage = new ConfigurationPage(page);

    await page.goto('/');
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

  test.afterEach(async () => {
    await page?.close();
  });

  test('Check the command bar visuals', async () => {
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

  test('Check the command bar search works correctly', async () => {
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
    await expect(page.getByText('Loading reports...')).not.toBeVisible({
      timeout: 10000, // Wait for 10 seconds max for reports to load
    }); // wait for screen to load

    // Navigate to schedule page
    await page.keyboard.press('ControlOrMeta+k');
    await expect(page).toMatchThemeScreenshots();

    await page.getByRole('option', { name: 'Schedules', exact: true }).click();
    await expect(
      page.getByRole('button', {
        name: 'Add new schedule',
      }),
    ).toBeVisible();
  });

  test('Shows and navigates to recent command bar entries', async () => {
    await page.keyboard.press('ControlOrMeta+k');
    await expect(page.getByText('Recent', { exact: true })).not.toBeVisible();

    await page.getByRole('option', { name: 'Reports', exact: true }).click();
    await expect(page.getByTestId('reports-page')).toBeVisible();
    await expect(page.getByText('Loading reports...')).not.toBeVisible({
      timeout: 10000,
    });
    await page.getByRole('button', { name: 'Rename dashboard' }).click();
    await page.getByRole('textbox').fill('Reports');
    await page.getByRole('textbox').press('Enter');
    await expect(
      page.getByRole('button', { name: 'Rename dashboard' }),
    ).toBeVisible();

    await page.keyboard.press('ControlOrMeta+k');
    await page.getByRole('option', { name: 'Tags', exact: true }).click();
    await expect(page).toHaveURL(/\/tags$/);

    await page.keyboard.press('ControlOrMeta+k');
    const recentGroup = page
      .locator('[cmdk-group]')
      .filter({ has: page.getByText('Recent', { exact: true }) });

    await expect(recentGroup).toBeVisible();
    await expect(recentGroup.getByRole('option')).toHaveText([
      'Reports',
      'Budget',
    ]);
    await expect(
      page.locator('[cmdk-group]:not([hidden])').first(),
    ).toContainText('Recent');

    await recentGroup
      .getByRole('option', { name: 'Reports', exact: true })
      .click();
    await expect(page.getByTestId('reports-page')).toBeVisible();
  });
});
