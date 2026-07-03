import type { Page } from '@playwright/test';

import { expect, test } from './fixtures';
import type { AccountPage } from './page-models/account-page';
import { ConfigurationPage } from './page-models/configuration-page';
import { Navigation } from './page-models/navigation';

// Covers RECON-01, 03, 04, 05, 06, 07, 08, 09 from
// snorkel-assignment/TEST_PLAN.md (account reconciliation).
test.describe('Account reconciliation', () => {
  let page: Page;
  let navigation: Navigation;
  let configurationPage: ConfigurationPage;
  let accountPage: AccountPage;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    navigation = new Navigation(page);
    configurationPage = new ConfigurationPage(page);

    await page.goto('/');
    await configurationPage.createTestFile();

    // A fresh, empty account rather than a fixture one: fixture accounts
    // may already have cleared/reconciled history baked in, which would
    // make the cleared-balance and "Not yet reconciled" assertions below
    // unreliable.
    accountPage = await navigation.createAccount({
      name: 'E2E Reconcile Account',
      offBudget: false,
      balance: 0,
    });
    await accountPage.waitFor();
  });

  test.afterEach(async () => {
    await page?.close();
  });

  test('opening the reconcile menu pre-fills the balance input with the cleared balance', async () => {
    await accountPage.createSingleTransaction({
      payee: '',
      notes: 'cleared txn',
      credit: '60',
    });
    await accountPage.toggleCleared(0);

    const popover = await accountPage.openReconcileMenu();
    await expect(popover.getByRole('textbox')).toHaveValue('60.00');
  });

  test('submitting a balance equal to the cleared balance shows "All reconciled!"; locking marks transactions reconciled', async () => {
    const statusBefore = await accountPage.getReconcileStatusText();
    expect(statusBefore).toContain('Not yet reconciled');

    await accountPage.createSingleTransaction({
      payee: '',
      notes: 'cleared txn',
      credit: '60',
    });
    await accountPage.toggleCleared(0);

    // Submits the pre-filled (matching) cleared balance as-is.
    await accountPage.reconcile();

    await expect(accountPage.reconciliationAllReconciledText).toBeVisible();
    await expect(accountPage.reconciliationDoneButton).toHaveText(
      'Lock transactions',
    );
    await expect(
      accountPage.createReconciliationTransactionButton,
    ).not.toBeVisible();

    await accountPage.reconciliationDoneButton.click();

    await expect
      .poll(() => accountPage.getReconcileStatusText())
      .not.toContain('Not yet reconciled');
  });

  test('submitting a different balance shows the difference; creating an adjustment transaction reconciles it', async () => {
    await accountPage.createSingleTransaction({
      payee: '',
      notes: 'cleared txn',
      credit: '60',
    });
    await accountPage.toggleCleared(0);

    // Bank balance is $15 higher than the cleared register total.
    await accountPage.reconcile('75');

    await expect(accountPage.reconciliationAllReconciledText).not.toBeVisible();
    await expect(accountPage.reconciliationDoneButton).toHaveText(
      'Exit reconciliation',
    );
    await expect(
      accountPage.createReconciliationTransactionButton,
    ).toBeVisible();

    await accountPage.createReconciliationTransactionButton.click();

    // Newest transactions are shown first, so the adjustment lands at row 0.
    const adjustment = accountPage.getNthTransaction(0);
    await expect(adjustment.notes).toHaveText(
      'Reconciliation balance adjustment',
    );
    await expect(adjustment.credit).toHaveText('15.00');

    // The cleared total now matches the $75 target reactively.
    await expect(accountPage.reconciliationAllReconciledText).toBeVisible();
  });

  test('exiting reconciliation without creating an adjustment leaves everything unchanged', async () => {
    await accountPage.createSingleTransaction({
      payee: '',
      notes: 'cleared txn',
      credit: '60',
    });
    await accountPage.toggleCleared(0);

    await accountPage.reconcile('75');
    await accountPage.reconciliationDoneButton.click(); // "Exit reconciliation"

    await expect(accountPage.reconciliationAllReconciledText).not.toBeVisible();
    await expect(accountPage.transactionTableRow).toHaveCount(1);

    // The transaction itself was never locked: editing it afterward does
    // not trigger the reconciled-transaction warning. (Note: the account's
    // "last reconciled" timestamp *does* update on "Exit reconciliation"
    // even though nothing was actually reconciled — that status text is
    // not a reliable signal of whether anything changed.)
    await accountPage.editTransactionAmount(0, 'credit', '65');
    await expect(
      accountPage.reconciledTransactionWarningHeading,
    ).not.toBeVisible();
    await expect(accountPage.getNthTransaction(0).credit).toHaveText('65.00');
  });

  test('editing a reconciled transaction shows a warning before the change is applied', async () => {
    await accountPage.createSingleTransaction({
      payee: '',
      notes: 'cleared txn',
      credit: '60',
    });
    await accountPage.toggleCleared(0);
    await accountPage.reconcile();
    await accountPage.reconciliationDoneButton.click(); // locks -> reconciled: true

    await accountPage.editTransactionAmount(0, 'credit', '70');

    await expect(accountPage.reconciledTransactionWarningHeading).toBeVisible();
    // Not applied yet.
    await expect(accountPage.getNthTransaction(0).credit).toHaveText('60.00');

    await accountPage.confirmReconciledTransactionWarning();

    await expect(accountPage.getNthTransaction(0).credit).toHaveText('70.00');
  });

  test('deleting a reconciled transaction shows a warning before it is removed', async () => {
    // KNOWN BUG (found while writing this test, intentionally not exercised
    // here): cancelling this specific warning crashes the app with
    // `TypeError: onCancel is not a function`. The batch/selection-based
    // delete path (`checkForReconciledTransactions` in
    // useTransactionBatchActions.ts) pushes the 'confirm-transaction-edit'
    // modal without an `onCancel` handler, but `ConfirmTransactionEditModal`
    // unconditionally calls `onCancel()` from its Cancel button. The
    // single-transaction inline-edit path (exercised in the "editing a
    // reconciled transaction" test above) passes `onCancel` correctly, so
    // this only affects delete. Only the Confirm path is covered below
    // until that's fixed.
    await accountPage.createSingleTransaction({
      payee: '',
      notes: 'cleared txn',
      credit: '60',
    });
    await accountPage.toggleCleared(0);
    await accountPage.reconcile();
    await accountPage.reconciliationDoneButton.click();

    await accountPage.deleteNthTransaction(0);
    await expect(accountPage.reconciledTransactionWarningHeading).toBeVisible();
    // Not removed yet.
    await expect(accountPage.transactionTableRow).toHaveCount(1);

    // Confirming proceeds to the generic delete confirmation, and only
    // then removes the transaction.
    await accountPage.confirmReconciledTransactionWarning();
    await expect(accountPage.transactionTableRow).toHaveCount(1);
    await accountPage.confirmDeleteModal();
    await expect(accountPage.transactionTableRow).toHaveCount(0);
  });
});
