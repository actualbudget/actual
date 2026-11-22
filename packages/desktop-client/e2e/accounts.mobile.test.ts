import type { Page } from '@playwright/test';

import { expect, test } from './fixtures';
import { ConfigurationPage } from './page-models/configuration-page';
import { MobileNavigation } from './page-models/mobile-navigation';
import { MobileTransactionEntryPage } from './page-models/mobile-transaction-entry-page';

test.describe('Mobile Accounts', () => {
  let page: Page;
  let navigation: MobileNavigation;
  let configurationPage: ConfigurationPage;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    navigation = new MobileNavigation(page);
    configurationPage = new ConfigurationPage(page);

    await page.setViewportSize({
      width: 350,
      height: 600,
    });
    await page.goto('/');
    await configurationPage.createTestFile();
  });

  test.afterEach(async () => {
    await page?.close();
  });

  test('opens the accounts page and asserts on balances', async () => {
    const accountsPage = await navigation.goToAccountsPage();
    await accountsPage.waitFor();

    const account = await accountsPage.getNthAccount(1);

    await expect(account.name).toHaveText('Ally Savings');
    await expect(account.balance).toHaveText('7,653.00');
    await expect(page).toMatchThemeScreenshots();
  });

  test('opens individual account page and checks that filtering is working', async () => {
    const accountsPage = await navigation.goToAccountsPage();
    await accountsPage.waitFor();

    const accountPage = await accountsPage.openNthAccount(0);
    await accountPage.waitFor();

    await expect(accountPage.heading).toHaveText('Bank of America');
    await expect(accountPage.transactionList).toBeVisible();
    expect(await accountPage.getBalance()).toBeGreaterThan(0);
    await expect(accountPage.noTransactionsMessage).not.toBeVisible();
    await expect(page).toMatchThemeScreenshots();

    await accountPage.searchByText('nothing should be found');
    await expect(accountPage.noTransactionsMessage).toBeVisible();
    await expect(accountPage.transactions).toHaveCount(0);
    await expect(page).toMatchThemeScreenshots();

    await accountPage.clearSearch();
    await expect(accountPage.transactions).not.toHaveCount(0);

    await accountPage.searchByText('Kroger');
    await expect(accountPage.transactions).not.toHaveCount(0);
    await expect(page).toMatchThemeScreenshots();
  });

  test('keeps the search after opening a transaction and going back', async () => {
    const accountsPage = await navigation.goToAccountsPage();
    await accountsPage.waitFor();

    const accountPage = await accountsPage.openNthAccount(0);
    await accountPage.waitFor();

    await accountPage.searchByText('Kroger');
    await expect(page).toHaveURL(/[?&]search=Kroger/);
    // Wait for the filtered list; unfiltered, the first rows are schedules.
    await expect(accountPage.transactions.first()).toContainText('Kroger');
    const searchedCount = await accountPage.transactions.count();

    await accountPage.transactions.first().click();
    const transactionPage = new MobileTransactionEntryPage(page);
    await transactionPage.waitFor();

    await page.getByRole('button', { name: 'Back', exact: true }).click();
    await accountPage.waitFor();

    await expect(accountPage.searchBox).toHaveValue('Kroger');
    await expect(page).toHaveURL(/[?&]search=Kroger/);
    await expect(accountPage.transactions).toHaveCount(searchedCount);
  });

  test('selects the last search result while the selection bar is shown', async () => {
    const accountsPage = await navigation.goToAccountsPage();
    await accountsPage.waitFor();

    const accountPage = await accountsPage.openNthAccount(0);
    await accountPage.waitFor();

    await accountPage.searchByText('Kroger');
    // Wait until only search results are listed, so the long press does not
    // land on a row that is about to be replaced.
    await expect(
      accountPage.transactions.filter({ hasNotText: 'Kroger' }),
    ).toHaveCount(0);

    await accountPage.longPressTransaction(accountPage.transactions.first());
    await expect(accountPage.selectedCount).toHaveText(
      '1 transaction selected',
    );

    await accountPage.scrollToEndOfList();
    // Forced so the click lands on whatever is on top at the row's centre:
    // the selection bar must not cover the last row.
    await accountPage.transactions.last().click({ force: true });
    await expect(accountPage.selectedCount).toHaveText(
      '2 transactions selected',
    );
  });

  test('reconciles an account', async () => {
    const accountsPage = await navigation.goToAccountsPage();
    await accountsPage.waitFor();

    const accountPage = await accountsPage.openNthAccount(0);
    await accountPage.waitFor();

    await accountPage.startReconciliation('200.00');
    await expect(accountPage.reconcilingBannerDifference).toBeVisible();
    await expect(page).toMatchThemeScreenshots();

    await accountPage.createReconciliationTransaction();
    await expect(accountPage.reconcilingBannerAllReconciled).toBeVisible();
    await expect(page).toMatchThemeScreenshots();

    await accountPage.unclearFirstTransaction();
    await expect(accountPage.reconcilingBannerDifference).toBeVisible();

    await accountPage.clearFirstTransaction();
    await expect(accountPage.reconcilingBannerAllReconciled).toBeVisible();

    await accountPage.lockTransactions();
    await expect(accountPage.reconcilingBanner).not.toBeVisible();
    const reconcileModal = await accountPage.reopenReconciliation();
    await expect(
      reconcileModal.getByText('Reconciled less than a minute ago', {
        exact: false,
      }),
    ).toBeVisible();
    // Closing the reconcile modal returns to the account menu beneath it
    await reconcileModal
      .getByRole('button', { name: 'Close', exact: true })
      .click();
    await expect(reconcileModal).not.toBeVisible();
    // The menu has no close button, tapping outside the sheet dismisses it
    const accountMenuModal = page.getByTestId('account-menu-modal');
    // If more tests need to dismiss a sheet, add a dedicated method, but for now, tap out of the way
    await accountMenuModal.click({ position: { x: 5, y: 5 } });
    await expect(accountMenuModal).not.toBeVisible();

    await page.getByRole('button', { name: 'Back', exact: true }).click();
    await expect(accountsPage.accountList).toBeVisible();
  });

  test('does not mark the account reconciled when exiting an unbalanced reconciliation', async () => {
    const accountsPage = await navigation.goToAccountsPage();
    await accountsPage.waitFor();

    const accountPage = await accountsPage.openNthAccount(0);
    await accountPage.waitFor();

    await accountPage.startReconciliation('200.00');
    await expect(accountPage.reconcilingBannerDifference).toBeVisible();

    await accountPage.exitReconciliation();
    // The banner going away means reconcile mode has ended
    await expect(accountPage.reconcilingBanner).not.toBeVisible();

    const reconcileModal = await accountPage.reopenReconciliation();
    await expect(reconcileModal.getByText('Not yet reconciled')).toBeVisible();
  });
});
