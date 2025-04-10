import { type Page } from '@playwright/test';

import { expect, test } from './fixtures';
import { ConfigurationPage } from './page-models/configuration-page';
import { Navigation } from './page-models/navigation';
import { type PayeesPage } from './page-models/payees-page';

test.describe('Payees', () => {
  let page: Page;
  let configurationPage: ConfigurationPage;
  let navigation: Navigation;
  let payeesPage: PayeesPage;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    navigation = new Navigation(page);
    configurationPage = new ConfigurationPage(page);

    // Navigate to the root URL and create a fresh test file
    await page.goto('/');
    await configurationPage.createTestFile();
  });

  test.afterAll(async () => {
    await page.close();
  });

  test.beforeEach(async () => {
    // Navigate to the Payees page before each test
    payeesPage = await navigation.goToPayeesPage();
  });

  test('checks the payees page visuals', async () => {
    // This is a simple visual check to ensure the page loads
    await expect(page).toMatchThemeScreenshots();

    // Try searching for “Fast Internet” or “Home Depot,” etc.
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

  test('filters out unrelated payees', async () => {
    await payeesPage.searchFor('asdfasdf-nonsense');

    // Get the text 'No payees' matching the search from the page
    const noPayeesMessage = page.locator('text=No payees').first();

    // Assert it is visible
    await expect(noPayeesMessage).toBeVisible();
  });
});
