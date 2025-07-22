import { type Page } from '@playwright/test';

import { expect, test } from './fixtures';
import { type BudgetPage } from './page-models/budget-page';
import { ConfigurationPage } from './page-models/configuration-page';

test.describe('Help menu', () => {
  let page: Page;
  let configurationPage: ConfigurationPage;
  let budgetPage: BudgetPage;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    configurationPage = new ConfigurationPage(page);

    await page.goto('/');
    budgetPage = await configurationPage.createTestFile();

    // Move mouse to corner of the screen;
    // sometimes the mouse hovers on a budget element thus rendering an input box
    // and this breaks screenshot tests
    await page.mouse.move(0, 0);
  });

  test.afterAll(async () => {
    await page.close();
  });

  test('The "?" Shortcut open the help menu', async () => {
    await budgetPage.page.keyboard.press('?');
    await expect(page.getByRole('dialog', { name: 'Help' })).toBeVisible();
    await expect(page).toMatchThemeScreenshots();
  });

  test('Check the keyboard shortcuts modal visuals', async () => {
    await budgetPage.page.keyboard.press('?');
    await page.click('text=Keyboard shortcuts');
    await expect(
      page.getByRole('dialog', { name: 'Modal dialog' }),
    ).toBeVisible();

    await expect(page).toMatchThemeScreenshots();

    const searchBox = page.getByRole('searchbox', {
      name: 'Search shortcuts',
    });
    await searchBox.fill('command');
    await expect(page.getByText('Open the Command Palette')).toBeVisible();
    await expect(page).toMatchThemeScreenshots();

    const backButton = page.getByRole('button', { name: 'Back' });
    await backButton.click();

    expect(searchBox).toHaveValue('');

    await page.getByText('General').click();

    await expect(page.getByText('Open the help menu')).toBeVisible();
    await expect(page).toMatchThemeScreenshots();
  });
});
