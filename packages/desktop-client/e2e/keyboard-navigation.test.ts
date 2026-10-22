/**
 * End-to-end coverage for keyboard navigation across editable tables.
 *
 * Organized by surface (budget grid, transactions table, etc.). Each
 * inner describe owns its setup so future keyboard work (arrow-key
 * cursor, Enter to edit, Space to toggle selection, layered Escape
 * between cell and row cursors) can add tests next to existing ones for
 * the same surface without restructuring.
 */

import type { Page } from '@playwright/test';

import { expect, test } from './fixtures';
import type { BudgetPage } from './page-models/budget-page';
import { ConfigurationPage } from './page-models/configuration-page';
import { Navigation } from './page-models/navigation';

test.describe('Keyboard navigation', () => {
  test.describe('Budget grid', () => {
    let page: Page;
    let budgetPage: BudgetPage;

    test.beforeEach(async ({ browser }) => {
      page = await browser.newPage();
      const configurationPage = new ConfigurationPage(page);
      await page.goto('/');
      budgetPage = await configurationPage.createTestFile();
      await budgetPage.waitFor();
      await page.mouse.move(0, 0);
    });

    test.afterEach(async () => {
      await page?.close();
    });

    test('escape on a $0 cell exits edit mode without committing the typed value', async () => {
      const firstCategoryRow = budgetPage.budgetTable.getByTestId('row').nth(1);
      const budgetCell = firstCategoryRow.getByTestId('budget').first();
      const totalBefore = await budgetPage.getTotalBudgeted();

      await budgetCell.click();
      const input = budgetCell.locator('input');
      await expect(input).toBeVisible();

      await page.keyboard.type('123');
      await page.keyboard.press('Escape');

      await expect(input).toBeHidden();
      expect(await budgetPage.getTotalBudgeted()).toBe(totalBefore);
    });

    test('escape on a cell with an existing value reverts the typed value', async () => {
      const firstCategoryRow = budgetPage.budgetTable.getByTestId('row').nth(1);
      const budgetCell = firstCategoryRow.getByTestId('budget').first();

      // Commit an initial value of 400 via Enter.
      await budgetCell.click();
      await expect(budgetCell.locator('input')).toBeVisible();
      await page.keyboard.type('400');
      await page.keyboard.press('Enter');
      await expect(budgetCell.locator('input')).toBeHidden();
      await expect(budgetCell).toContainText('400');
      const committedText = await budgetCell.textContent();

      // Re-open the cell, type something else, press Escape: value
      // should stay at 400.
      await budgetCell.click();
      const input = budgetCell.locator('input');
      await expect(input).toBeVisible();

      await page.keyboard.type('123');
      await page.keyboard.press('Escape');

      await expect(input).toBeHidden();
      expect(await budgetCell.textContent()).toBe(committedText);

      // Canceling must leave the next unchanged edit usable too.
      await budgetCell.click();
      await expect(input).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(input).toBeHidden();
      expect(await budgetCell.textContent()).toBe(committedText);
    });
  });

  test.describe('Transactions table', () => {
    let page: Page;
    let navigation: Navigation;

    test.beforeEach(async ({ browser }) => {
      page = await browser.newPage();
      navigation = new Navigation(page);
      const configurationPage = new ConfigurationPage(page);
      await page.goto('/');
      const budgetPage = await configurationPage.createTestFile();
      await budgetPage.waitFor();
      await page.mouse.move(0, 0);
    });

    test.afterEach(async () => {
      await page?.close();
    });

    for (const field of ['payee', 'category'] as const) {
      test(`${field} mouse selection persists after revisiting the cell`, async () => {
        const accountPage = await navigation.createAccount({
          name: `Repeated ${field} editing`,
          offBudget: false,
          balance: 100,
        });
        const transaction = accountPage.getNthTransaction(0);
        const cell = transaction[field];
        const popup = page.getByTestId('autocomplete');
        const option =
          field === 'payee'
            ? popup.getByTestId('Fast Internet-payee-item')
            : popup.getByText('Food', { exact: true });

        // Visit without typing or changing the value, then return.
        await cell.click();
        await expect(cell.locator('input')).toBeVisible();
        await transaction.notes.click();
        await cell.click();
        await option.click();
        await transaction.notes.click();
        await expect(cell).toHaveText(
          field === 'payee' ? 'Fast Internet' : 'Food',
        );

        // Reopening and saving the same option must also leave a usable editor.
        await cell.click();
        await option.click();
        await transaction.notes.click();
        await cell.click();
        await expect(popup).toBeVisible();
        await page.keyboard.press('Escape');
        await expect(popup).toBeHidden();
        await page.keyboard.press('Escape');
        await expect(cell.locator('input')).toBeHidden();
        await cell.click();
        const nextOption =
          field === 'payee'
            ? popup.getByTestId('Home Depot-payee-item')
            : popup.getByText('Starting Balances', { exact: true });
        await nextOption.click();
        await transaction.notes.click();
        await expect(cell).toHaveText(
          field === 'payee' ? 'Home Depot' : 'Starting Balances',
        );
      });
    }

    test('notes can be canceled repeatedly without typing', async () => {
      const accountPage = await navigation.createAccount({
        name: 'Repeated notes editing',
        offBudget: false,
        balance: 100,
      });
      const notes = accountPage.getNthTransaction(0).notes;
      for (let session = 0; session < 2; session++) {
        await notes.click();
        await expect(notes.locator('input')).toBeVisible();
        await page.keyboard.press('Escape');
        await expect(notes.locator('input')).toBeHidden();
        await expect(notes).toHaveText('');
      }
    });

    test('escape on a cell exits edit mode and reverts the typed value', async () => {
      const accountPage = await navigation.createAccount({
        name: 'Test Checking',
        offBudget: false,
        balance: 1000,
      });

      const transaction = accountPage.getNthTransaction(0);
      await transaction.notes.click();
      const input = transaction.notes.locator('input');
      await expect(input).toBeVisible();

      await page.keyboard.type('temporary text');
      await page.keyboard.press('Escape');

      await expect(input).toBeHidden();
      await expect(transaction.notes).toHaveText('');
    });

    test('escape clears the multi-selected rows in a single press', async () => {
      const accountPage = await navigation.createAccount({
        name: 'Test Savings',
        offBudget: false,
        balance: 100,
      });

      await accountPage.createSingleTransaction({
        payee: 'Coffee',
        notes: 'a',
        debit: '5.00',
      });
      await accountPage.createSingleTransaction({
        payee: 'Lunch',
        notes: 'b',
        debit: '12.00',
      });

      // Wait for both newly created transactions to be in the list before
      // selecting them. Otherwise the second row may still be mounting when
      // the selection clicks land, the selection doesn't stick, and the
      // select button (rendered only when items are selected) never appears.
      await expect(accountPage.getNthTransaction(1).payee).toBeVisible();

      await accountPage.selectNthTransaction(0);
      await accountPage.selectNthTransaction(1);
      await expect(accountPage.selectButton).toBeVisible();

      // Press Escape immediately after the last checkbox click; focus
      // is still on that checkbox. The handler must treat checkbox-cell
      // focus as "not editing" so a single Escape clears the selection.
      await page.keyboard.press('Escape');

      await expect(accountPage.selectButton).toBeHidden();
    });

    test('escape peels off layers: edit mode first, then the selection set', async () => {
      const accountPage = await navigation.createAccount({
        name: 'Test Layered',
        offBudget: false,
        balance: 100,
      });

      await accountPage.createSingleTransaction({
        payee: 'Snack',
        notes: 'x',
        debit: '3.00',
      });

      // Wait for the new transaction row to be in the list before selecting,
      // so the selection sticks and the select button appears reliably.
      await expect(accountPage.getNthTransaction(0).payee).toBeVisible();

      await accountPage.selectNthTransaction(0);
      await expect(accountPage.selectButton).toBeVisible();

      const transaction = accountPage.getNthTransaction(1);
      await transaction.notes.click();
      const input = transaction.notes.locator('input');
      await expect(input).toBeVisible();

      await page.keyboard.type('typed but not saved');
      await page.keyboard.press('Escape');

      // First Escape: input gone, selection still visible, value reverted.
      await expect(input).toBeHidden();
      await expect(accountPage.selectButton).toBeVisible();
      await expect(transaction.notes).toHaveText('');

      // Second Escape: selection cleared.
      await page.keyboard.press('Escape');
      await expect(accountPage.selectButton).toBeHidden();
    });

    test('escape peels off 3 layers for popovers: popup first, then edit mode, then selection', async () => {
      const accountPage = await navigation.createAccount({
        name: 'Test Popover Layered',
        offBudget: false,
        balance: 100,
      });

      await accountPage.createSingleTransaction({
        payee: 'Snack',
        notes: 'x',
        debit: '3.00',
      });

      // Wait for the new transaction row to be in the list before selecting,
      // so the selection sticks and the select button appears reliably.
      await expect(accountPage.getNthTransaction(0).payee).toBeVisible();

      await accountPage.selectNthTransaction(0);
      await expect(accountPage.selectButton).toBeVisible();

      const transaction = accountPage.getNthTransaction(1);
      await transaction.category.click();
      const input = transaction.category.locator('input');
      await expect(input).toBeVisible();

      await page.keyboard.type('typed but not saved');
      await page.keyboard.press('Escape');

      // First Escape: popup closed, input remains visible.
      await expect(page.getByTestId('autocomplete')).toBeHidden();
      await expect(input).toBeVisible();
      await expect(accountPage.selectButton).toBeVisible();

      // Second Escape: edit mode closed.
      await page.keyboard.press('Escape');
      await expect(input).toBeHidden();
      await expect(accountPage.selectButton).toBeVisible();
      await expect(transaction.category).toHaveText('Starting Balances');

      // Third Escape: selection cleared.
      await page.keyboard.press('Escape');
      await expect(accountPage.selectButton).toBeHidden();
    });

    test('escape peels off 3 layers for tag popovers: popup first, then edit mode, then selection', async () => {
      const accountPage = await navigation.createAccount({
        name: 'Test Tag Popover Layered',
        offBudget: false,
        balance: 100,
      });

      await accountPage.createSingleTransaction({
        payee: 'Snack',
        notes: '#my_existing_tag',
        debit: '3.00',
      });

      await accountPage.selectNthTransaction(0);
      await expect(accountPage.selectButton).toBeVisible();

      // Click the first transaction's notes
      const transaction = accountPage.getNthTransaction(1);
      await transaction.notes.click();
      const input = transaction.notes.locator('input');
      await expect(input).toBeVisible();

      // Type `#my` to trigger the popup
      await page.keyboard.type('#my');
      await page.keyboard.press('Escape');

      // First Escape: popup closed, input remains visible in edit mode.
      await expect(input).toBeVisible();
      await expect(accountPage.selectButton).toBeVisible();

      // Second Escape: edit mode closed, text reverted.
      await page.keyboard.press('Escape');
      await expect(input).toBeHidden();
      await expect(accountPage.selectButton).toBeVisible();
      await expect(transaction.notes).toHaveText('');

      // Third Escape: selection cleared.
      await page.keyboard.press('Escape');
      await expect(accountPage.selectButton).toBeHidden();
    });

    test('escape on a date cell reverts the typed date', async () => {
      const accountPage = await navigation.createAccount({
        name: 'Test Date Revert',
        offBudget: false,
        balance: 100,
      });

      const transaction = accountPage.getNthTransaction(0);
      const dateCell = transaction.date;
      const committedDate = await dateCell.textContent();

      await dateCell.click();
      const input = dateCell.locator('input');
      await expect(input).toBeVisible();

      await input.press('Control+a');
      await page.keyboard.type('01/01/2020');
      await page.keyboard.press('Escape');

      await expect(input).toBeHidden();
      expect(await dateCell.textContent()).toBe(committedDate);
    });

    for (const previousAction of ['cancel', 'leave unchanged']) {
      test(`calendar selection saves after reopening following ${previousAction}`, async () => {
        const accountPage = await navigation.createAccount({
          name: `Calendar after ${previousAction}`,
          offBudget: false,
          balance: 100,
        });
        const transaction = accountPage.getNthTransaction(0);
        const dateCell = transaction.date;
        const originalDate = await dateCell.textContent();
        await dateCell.click();
        await expect(dateCell.locator('input')).toBeVisible();
        if (previousAction === 'cancel') {
          await page.keyboard.press('Escape');
          await expect(page.getByTestId('date-select-tooltip')).toBeHidden();
          await page.keyboard.press('Escape');
        } else {
          await transaction.notes.click();
        }
        await expect(dateCell.locator('input')).toBeHidden();
        await dateCell.click();
        const calendar = page.locator('[data-date-picker]');
        await expect(calendar).toBeVisible();
        // The fixture's starting balance is January 1; choose January 2.
        const originalInput = await dateCell.locator('input').inputValue();
        const selectedDate = originalInput.replace('01/01/', '01/02/');
        expect(selectedDate).not.toBe(originalDate);
        await calendar.getByRole('button', { name: /January 2,/ }).click();
        await transaction.notes.click();
        await expect(dateCell).toHaveText(selectedDate);
      });
    }

    test('escape in the add-new amount field exits the cell without discarding the row', async () => {
      const accountPage = await navigation.createAccount({
        name: 'Test Add New Escape',
        offBudget: false,
        balance: 100,
      });

      await accountPage.addNewTransactionButton.click();
      const newTransaction = accountPage.getEnteredTransaction();

      await newTransaction.notes.click();
      await page.keyboard.type('keep me');
      await page.keyboard.press('Tab');

      await newTransaction.debit.click();
      const debitInput = newTransaction.debit.locator('input');
      await expect(debitInput).toBeVisible();
      await page.keyboard.type('42.00');
      await page.keyboard.press('Escape');

      // The row survives with its other values intact.
      await expect(debitInput).toBeHidden();
      await expect(accountPage.newTransactionRow).toBeVisible();
      await expect(newTransaction.notes).toHaveText('keep me');

      // A second Escape closes the add row.
      await page.keyboard.press('Escape');
      await expect(accountPage.newTransactionRow).toBeHidden();
    });

    test('escape clears the selection in one press after clicking the cleared checkbox', async () => {
      const accountPage = await navigation.createAccount({
        name: 'Test Cleared Escape',
        offBudget: false,
        balance: 100,
      });

      await accountPage.createSingleTransaction({
        payee: 'Snack',
        notes: 'x',
        debit: '3.00',
      });

      await expect(accountPage.getNthTransaction(0).payee).toBeVisible();

      await accountPage.selectNthTransaction(0);
      await expect(accountPage.selectButton).toBeVisible();

      // The cleared icon focuses the cell (setting editingId) without
      // actually editing anything, so one Escape must still clear.
      await accountPage.getNthTransaction(0).cleared.click();
      await page.keyboard.press('Escape');

      await expect(accountPage.selectButton).toBeHidden();
    });
  });
});
