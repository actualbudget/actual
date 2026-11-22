import type { Page } from '@playwright/test';

import { expect, test } from './fixtures';
import { ConfigurationPage } from './page-models/configuration-page';
import { Navigation } from './page-models/navigation';
import type { PayeesPage } from './page-models/payees-page';

test.describe('Payees', () => {
  let page: Page;
  let configurationPage: ConfigurationPage;
  let navigation: Navigation;
  let payeesPage: PayeesPage;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    navigation = new Navigation(page);
    configurationPage = new ConfigurationPage(page);

    // Navigate to the root URL and create a fresh test file
    await page.goto('/');
    await configurationPage.createTestFile();

    // Navigate to the Payees page before each test
    payeesPage = await navigation.goToPayeesPage();
  });

  test.afterEach(async () => {
    await page?.close();
  });

  test('checks the payees page visuals', async () => {
    // This is a simple visual check to ensure the page loads
    await expect(page).toMatchThemeScreenshots();

    // Try searching for "Fast Internet" or "Home Depot," etc.
    await payeesPage.searchFor('Fast Internet');
    // Screenshot check after searching
    await expect(page).toMatchThemeScreenshots();
  });

  test('shows Fast Internet in the payee list', async () => {
    await payeesPage.searchFor('Fast Internet');
    await expect(page.getByText('Fast Internet')).toBeVisible();
  });

  test('shows "Create rule" text for a payee', async () => {
    await payeesPage.searchFor('Deposit');
    await expect(page.getByText('Create rule')).toBeVisible();
  });

  test('table can be entered and left with the keyboard', async () => {
    const table = page.getByTestId('table');
    const firstRow = table.getByTestId('row').first();
    const selectButton = firstRow
      .getByTestId('select')
      .getByTestId('cell-button');
    const isFocusInTable = () =>
      table.evaluate(el => el.contains(document.activeElement));

    await table.focus();
    await page.keyboard.press('Shift+Tab');
    const previous = page.locator(':focus');
    await expect(previous).toHaveCount(1);
    expect(await isFocusInTable()).toBe(false);

    await page.keyboard.press('Tab');
    await expect(table).toBeFocused();
    expect(
      await table.evaluate(
        el => getComputedStyle(el, '::after').borderTopStyle,
      ),
    ).toBe('solid');

    await page.keyboard.press('Tab');
    expect(await isFocusInTable()).toBe(false);

    await table.focus();
    await page.keyboard.press('Enter');
    await expect(selectButton).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(firstRow.locator('input')).toBeFocused();

    await page.keyboard.press('Shift+Tab');
    await expect(selectButton).toBeFocused();

    // Escape leaves the cell selected, where Tab moves across columns; a
    // second Escape clears the selection so Tab leaves the table
    await page.keyboard.press('Escape');
    await expect(table).toBeFocused();
    await page.keyboard.press('Escape');

    await page.keyboard.press('Tab');
    expect(await isFocusInTable()).toBe(false);
  });

  test('outlines every selectable column and keeps checked rows highlighted', async () => {
    await payeesPage.searchFor('Fast Internet');
    const table = page.getByTestId('table');
    const row = table.getByTestId('row').first();
    const isOutlined = (field: string) =>
      table
        .locator(`[data-cursor-field="${field}"] [data-testid="${field}"]`)
        .evaluate(el => getComputedStyle(el).boxShadow.includes('inset'));
    const rowBackground = () =>
      row.evaluate(el => getComputedStyle(el).backgroundColor);

    await table.focus();
    await page.keyboard.press('ArrowDown');
    expect(await isOutlined('select')).toBe(true);
    const selectedColor = await rowBackground();

    for (const field of ['name', 'rule-count']) {
      await page.keyboard.press('Tab');
      expect(await isOutlined(field)).toBe(true);
      if (field === 'name') {
        await expect(row).toMatchThemeScreenshots();
      }
    }

    // A checked row keeps its own color while a cell in it is selected
    await page.keyboard.press('Space');
    await expect(
      page.getByTestId('selected-payees-select-button'),
    ).toBeVisible();
    expect(await rowBackground()).not.toBe(selectedColor);
    await expect(row).toMatchThemeScreenshots();

    await page.keyboard.press('Escape');
    await expect(
      page.getByTestId('selected-payees-select-button'),
    ).toBeHidden();
    expect(await rowBackground()).toBe(selectedColor);
  });

  test('filters out unrelated payees', async () => {
    await payeesPage.searchFor('asdfasdf-nonsense');

    // Get the text 'No payees' matching the search from the page
    const noPayeesMessage = page.locator('text=No payees').first();

    // Assert it is visible
    await expect(noPayeesMessage).toBeVisible();
  });

  test('right clicking a payee opens context menu', async () => {
    await payeesPage.searchFor('Fast Internet');
    await payeesPage.rightClickNthPayee(0);
    const menu = page.getByRole('menu');
    await expect(menu).toBeVisible();
    await expect(
      menu.getByRole('button', { name: 'Create rule' }),
    ).toBeVisible();
  });
});
