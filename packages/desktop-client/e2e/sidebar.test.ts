import type { Page } from '@playwright/test';

import { expect, test } from './fixtures';
import { ConfigurationPage } from './page-models/configuration-page';
import { Navigation } from './page-models/navigation';

test.describe('Sidebar', () => {
  let page: Page;
  let navigation: Navigation;
  let configurationPage: ConfigurationPage;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    navigation = new Navigation(page);
    configurationPage = new ConfigurationPage(page);

    await page.goto('/');
    await configurationPage.createTestFile();
  });

  test.afterEach(async () => {
    await page?.close();
  });

  test('checks the page visuals at all three widths', async () => {
    await expect(page).toMatchThemeScreenshots();

    const widthToggle = page.getByRole('button', {
      name: /Switch sidebar width/,
    });
    await widthToggle.click(); // Full -> Rail
    await expect(page).toMatchThemeScreenshots();

    await widthToggle.click(); // Rail -> Compact
    await expect(page).toMatchThemeScreenshots();
  });

  test('cycles through rail, compact and full width via the footer toggle', async () => {
    // Starts at Full width: the "All transactions" header text renders,
    // and the footer "Add account" button is visible.
    const addAccountButton = page.getByRole('button', { name: 'Add account' });
    await expect(
      page.getByText('All transactions', { exact: true }),
    ).toBeVisible();
    await expect(addAccountButton).toBeVisible();

    const widthToggle = page.getByRole('button', {
      name: /Switch sidebar width/,
    });

    await widthToggle.click();
    // Rail width: the footer "Add account" button (and its label text)
    // disappears entirely.
    await expect(addAccountButton).toBeHidden();

    await widthToggle.click();
    // Compact width: the footer button is back, but the Transactions
    // widget collapses to a single row (no "All transactions" header).
    await expect(addAccountButton).toBeVisible();
    await expect(
      page.getByText('All transactions', { exact: true }),
    ).toBeHidden();

    await widthToggle.click();
    // Back to Full width.
    await expect(
      page.getByText('All transactions', { exact: true }),
    ).toBeVisible();
  });

  test('the pending transactions stat deep-links into a filtered register', async () => {
    await page.getByRole('button', { name: /pending/i }).click();

    await expect(page).toHaveURL(/\/accounts$/);
    // A filter chip for the deep-linked condition is applied on arrival.
    await expect(
      page.getByRole('button', { name: 'Delete filter' }),
    ).toBeVisible();
  });

  test('the scheduled stat deep-links to the schedules page', async () => {
    const schedulesPage = await navigation.goToSchedulesPage();
    await expect(page).toHaveURL(/\/schedules$/);
    await schedulesPage.page
      .getByRole('button', { name: 'Add new schedule' })
      .waitFor();
  });

  test('Settings tabs navigate between the consolidated sections', async () => {
    await navigation.goToSettingsPage();
    await expect(page).toHaveURL(/\/settings$/);

    await page.getByRole('link', { name: 'Payees' }).click();
    await expect(page).toHaveURL(/\/settings\/payees$/);
    await expect(page.getByPlaceholder('Filter payees...')).toBeVisible();

    await page.getByRole('link', { name: 'Rules' }).click();
    await expect(page).toHaveURL(/\/settings\/rules$/);
    await expect(page.getByPlaceholder('Filter rules...')).toBeVisible();

    await page.getByRole('link', { name: 'Tags' }).click();
    await expect(page).toHaveURL(/\/settings\/tags$/);

    await page.getByRole('link', { name: 'General', exact: true }).click();
    await expect(page).toHaveURL(/\/settings$/);
    await expect(page.getByTestId('settings')).toBeVisible();
  });

  test('old bookmarked destination URLs still resolve directly', async () => {
    await page.goto('/payees');
    await expect(page.getByPlaceholder('Filter payees...')).toBeVisible();

    await page.goto('/rules');
    await expect(page.getByPlaceholder('Filter rules...')).toBeVisible();
  });

  test('collapsing an account group hides its rows but keeps the group total', async () => {
    const onBudgetHeader = page.getByRole('button', {
      name: 'Collapse on budget accounts',
    });
    await expect(onBudgetHeader).toBeVisible();

    const firstOnBudgetAccount = page.getByRole('link', {
      name: /^Ally Savings/,
    });
    await expect(firstOnBudgetAccount).toBeVisible();

    await onBudgetHeader.click();
    await expect(firstOnBudgetAccount).toBeHidden();
    await expect(page.getByRole('link', { name: /^On budget/ })).toBeVisible();

    await page
      .getByRole('button', { name: 'Expand on budget accounts' })
      .click();
    await expect(firstOnBudgetAccount).toBeVisible();
  });

  test('pinning and unpinning an account from the rail', async () => {
    await navigation.rightClickAccount('Roth IRA');
    await page.getByRole('button', { name: 'Pin to rail' }).click();

    await page.getByRole('button', { name: /Switch sidebar width/ }).click(); // Full -> Rail
    await expect(page.getByRole('button', { name: 'Roth IRA' })).toBeVisible();

    await page.getByRole('button', { name: /Switch sidebar width/ }).click(); // Rail -> Compact
    await page.getByRole('button', { name: /Switch sidebar width/ }).click(); // Compact -> Full

    await navigation.rightClickAccount('Roth IRA');
    await page.getByRole('button', { name: 'Unpin from rail' }).click();

    await page.getByRole('button', { name: /Switch sidebar width/ }).click(); // Full -> Rail
    await expect(page.getByRole('button', { name: 'Roth IRA' })).toBeHidden();
  });
});
