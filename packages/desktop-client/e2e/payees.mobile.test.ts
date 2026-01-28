import type { Page } from '@playwright/test';

import { expect, test } from './fixtures';
import { ConfigurationPage } from './page-models/configuration-page';
import { MobileNavigation } from './page-models/mobile-navigation';
import type { MobilePayeesPage } from './page-models/mobile-payees-page';

test.describe('Mobile Payees', () => {
  let page: Page;
  let navigation: MobileNavigation;
  let payeesPage: MobilePayeesPage;
  let configurationPage: ConfigurationPage;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    navigation = new MobileNavigation(page);
    configurationPage = new ConfigurationPage(page);

    // Set mobile viewport
    await page.setViewportSize({
      width: 350,
      height: 600,
    });

    await page.goto('/');
    await configurationPage.createTestFile();

    // Navigate to payees page and wait for it to load
    payeesPage = await navigation.goToPayeesPage();
  });

  test.afterEach(async () => {
    await page?.close();
  });

  test('checks the page visuals', async () => {
    await payeesPage.waitForLoadingToComplete();

    // Check that the header is present
    await expect(page.getByRole('heading', { name: 'Payees' })).toBeVisible();

    // Check that the search box is present with proper placeholder
    await expect(payeesPage.searchBox).toBeVisible();
    await expect(payeesPage.searchBox).toHaveAttribute(
      'placeholder',
      'Filter payees…',
    );

    const payeeCount = await payeesPage.getPayeeCount();
    expect(payeeCount).toBeGreaterThan(0);
    await expect(page).toMatchThemeScreenshots();
  });

  test('filters out unrelated payees', async () => {
    await payeesPage.searchFor('asdfasdf-nonsense');

    // Get the text 'No payees found.' from the page
    const noPayeesMessage = page.getByText('No payees found.');

    // Assert it is visible
    await expect(noPayeesMessage).toBeVisible();
    await expect(page).toMatchThemeScreenshots();
  });

  test('clicking on a payee opens payee edit page', async () => {
    await payeesPage.waitForLoadingToComplete();

    const payeeCount = await payeesPage.getPayeeCount();
    expect(payeeCount).toBeGreaterThan(0);

    await payeesPage.clickPayee(0);

    // Should navigate to payee edit page
    await expect(page).toHaveURL(/\/payees\/.+/);

    // Check that the edit page elements are visible
    await expect(
      page.getByRole('heading', { name: 'Edit Payee' }),
    ).toBeVisible();
    await expect(page.getByPlaceholder('Payee name')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Save' })).toBeVisible();

    await expect(page).toMatchThemeScreenshots();
  });

  test('page handles empty state gracefully', async () => {
    // Search for something that won't match to get empty state
    await payeesPage.searchFor('NonExistentPayee123456789');
    await page.waitForTimeout(500);

    // Check that empty message is shown
    const emptyMessage = page.getByText('No payees found.');
    await expect(emptyMessage).toBeVisible();

    // Check that no payee items are visible
    const payees = payeesPage.getAllPayees();
    await expect(payees).toHaveCount(0);
    await expect(page).toMatchThemeScreenshots();
  });

  test('search functionality works correctly', async () => {
    await payeesPage.waitForLoadingToComplete();

    // Test searching for a specific payee
    await payeesPage.searchFor('Fast Internet');

    // Should show at least one result
    const payeeCount = await payeesPage.getPayeeCount();
    expect(payeeCount).toBeGreaterThan(0);
    await expect(page).toMatchThemeScreenshots();

    // Clear search
    await payeesPage.clearSearch();

    // Should show all payees again
    const allPayeeCount = await payeesPage.getPayeeCount();
    expect(allPayeeCount).toBeGreaterThan(payeeCount);
    await expect(page).toMatchThemeScreenshots();
  });
});
