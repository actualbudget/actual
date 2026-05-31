import type { Page } from '@playwright/test';

import { expect, test } from './fixtures';
import { ConfigurationPage } from './page-models/configuration-page';
import { Navigation } from './page-models/navigation';
import type { PayeesPage } from './page-models/payees-page';

test.describe.serial('Payees', () => {
  let page: Page;
  let configurationPage: ConfigurationPage;
  let navigation: Navigation;
  let payeesPage: PayeesPage;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    navigation = new Navigation(page);
    configurationPage = new ConfigurationPage(page);

    await page.goto('/');
    await configurationPage.createTestFile();

    payeesPage = await navigation.goToPayeesPage();
    await payeesPage.waitFor();
  });

  test.afterEach(async () => {
    await page?.close();
  });

  test('checks the payees page visuals', async () => {
    await expect(page).toMatchThemeScreenshots();

    await payeesPage.searchFor('Fast Internet');
    await expect(payeesPage.getPayeeRow('Fast Internet')).toBeVisible();
    await expect(payeesPage.getPayeeRow('Deposit')).not.toBeVisible();
    await expect(page).toMatchThemeScreenshots();
  });

  test('supports case-insensitive search', async () => {
    await payeesPage.searchFor('fast internet');
    console.log(
      '[payees] searched "fast internet" (lowercase) — Fast Internet row visible',
    );
    await expect(payeesPage.getPayeeRow('Fast Internet')).toBeVisible();
    await expect(payeesPage.getPayeeRow('Deposit')).not.toBeVisible();

    await payeesPage.clearSearch();
    await payeesPage.searchFor('FAST INTERNET');
    console.log(
      '[payees] searched "FAST INTERNET" (uppercase) — Fast Internet row still visible',
    );
    await expect(payeesPage.getPayeeRow('Fast Internet')).toBeVisible();
    await expect(payeesPage.getPayeeRow('Deposit')).not.toBeVisible();
  });

  test('shows an empty state when no payees match', async () => {
    await payeesPage.searchFor('ZZZZZ_NONEXISTENT_12345');
    console.log(
      '[payees] searched "ZZZZZ_NONEXISTENT_12345" — empty state shown, no rows visible',
    );
    await expect(payeesPage.emptyMessage).toBeVisible();
    await expect(payeesPage.getPayeeRow('Deposit')).not.toBeVisible();
  });

  test('handles special-character search input', async () => {
    await payeesPage.searchFor('-');
    console.log(
      '[payees] searched "-" (special char) — search box accepted input, no crash',
    );
    await expect(payeesPage.searchBox).toHaveValue('-');
    await expect(payeesPage.getPayeeRow('Deposit')).not.toBeVisible();
  });

  test('opens the rule dialog from create rule', async () => {
    await payeesPage.searchFor('Deposit');

    await expect(payeesPage.getPayeeRow('Deposit')).toBeVisible();
    await expect(payeesPage.getCreateRuleButton('Deposit')).toBeVisible();
    console.log('[payees] "Deposit" payee found, Create Rule button visible');

    await payeesPage.getCreateRuleButton('Deposit').click();
    console.log(
      '[payees] clicked Create Rule — rule dialog opened with stage and actions sections',
    );

    await expect(page.getByText('Stage of rule:')).toBeVisible();
    await expect(page.getByText('Then apply these actions:')).toBeVisible();
  });

  test('shows expected sample payees on initial load', async () => {
    console.log(
      '[payees] verifying 4 demo payees visible on initial load: Deposit, Fast Internet, Home Depot, Kroger',
    );
    await expect(payeesPage.getPayeeRow('Deposit')).toBeVisible();
    await expect(payeesPage.getPayeeRow('Fast Internet')).toBeVisible();
    await expect(payeesPage.getPayeeRow('Home Depot')).toBeVisible();
    await expect(payeesPage.getPayeeRow('Kroger')).toBeVisible();
    console.log('[payees] all 4 demo payees confirmed visible');
  });

  test('loads with a functional search box', async () => {
    console.log('[payees] checking search box is visible and enabled on load');
    await expect(payeesPage.searchBox).toBeVisible();
    await expect(payeesPage.searchBox).toBeEnabled();
    await expect(payeesPage.getPayeeRow('Deposit')).toBeVisible();
    console.log('[payees] search box ready, payee list populated');
  });

  test('shows a create rule action for matching payees', async () => {
    await payeesPage.searchFor('Deposit');
    console.log(
      '[payees] searched "Deposit" — verifying Create Rule button is visible with correct label',
    );
    await expect(payeesPage.getCreateRuleButton('Deposit')).toBeVisible();
    await expect(payeesPage.getCreateRuleButton('Deposit')).toContainText(
      'Create rule',
    );
    console.log(
      '[payees] Create Rule button confirmed visible with text "Create rule"',
    );
  });

  test('supports selecting multiple payees', async () => {
    const depositSelect = payeesPage
      .getPayeeRow('Deposit')
      .getByTestId('select');
    const internetSelect = payeesPage
      .getPayeeRow('Fast Internet')
      .getByTestId('select');

    await expect(depositSelect).toBeVisible();
    await expect(internetSelect).toBeVisible();

    await depositSelect.click();
    await internetSelect.click();
    console.log(
      '[payees] selected 2 payees: Deposit and Fast Internet — expecting "2 payees" action button',
    );

    await expect(page.getByRole('button', { name: '2 payees' })).toBeVisible();
    await expect(page.getByText('Deposit')).toBeVisible();
    await expect(page.getByText('Fast Internet')).toBeVisible();
    console.log(
      '[payees] "2 payees" button visible, both selected payees confirmed in view',
    );
  });
});
