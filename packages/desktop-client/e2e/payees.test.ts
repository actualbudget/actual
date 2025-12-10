import { expect, test } from './fixtures';
import { ConfigurationPage } from './page-models/configuration-page';
import { Navigation } from './page-models/navigation';
import { type PayeesPage } from './page-models/payees-page';

test.describe('Payees', () => {
  let configurationPage: ConfigurationPage;
  let navigation: Navigation;
  let payeesPage: PayeesPage;

  test.beforeEach(async ({ page }) => {
    navigation = new Navigation(page);
    configurationPage = new ConfigurationPage(page);

    // Navigate to the root URL and create a fresh test file
    await configurationPage.createTestFile();
    // Navigate to the Payees page
    payeesPage = await navigation.goToPayeesPage();
  });

  test('checks the payees page visuals', async ({ page }) => {
    // This is a simple visual check to ensure the page loads
    await expect(page).toMatchThemeScreenshots();

    // Try searching for "Fast Internet" or "Home Depot," etc.
    await payeesPage.searchFor('Fast Internet');
    // Screenshot check after searching
    await expect(page).toMatchThemeScreenshots();
  });

  test('shows Fast Internet in the payee list', async ({ page }) => {
    await payeesPage.searchFor('Fast Internet');
    await expect(page.getByText('Fast Internet')).toBeVisible();
  });

  test('shows "Create rule" text for a payee', async ({ page }) => {
    await payeesPage.searchFor('Deposit');
    await expect(page.getByText('Create rule')).toBeVisible();
  });

  test('filters out unrelated payees', async ({ page }) => {
    await payeesPage.searchFor('asdfasdf-nonsense');

    // Get the text 'No payees' matching the search from the page
    const noPayeesMessage = page.locator('text=No payees').first();

    // Assert it is visible
    await expect(noPayeesMessage).toBeVisible();
  });
});
