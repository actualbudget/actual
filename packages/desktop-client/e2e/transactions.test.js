import { test, expect } from '@playwright/test';

test.describe.configure({ mode: 'serial' });

test.describe('Transactions', () => {
  let page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
  });

  test.afterAll(async () => {
    await page.close();
  });

  test('creates a test budget', async () => {
    await page.goto('/');

    await page.getByRole('button', { name: 'Create test file' }).click();
    await page.getByRole('button', { name: 'Close' }).click();
  });

  test('navigates to a specific account', async () => {
    await page.getByRole('link', { name: /^Ally Savings/ }).click();
  });

  test('creates a test transaction', async () => {
    await page.getByRole('button', { name: 'Add New' }).click();
    await page.keyboard.press('Tab');

    await page.keyboard.type('Hom');
    await page.keyboard.press('Enter');
    await page.keyboard.press('Tab');

    await page.keyboard.type('Notes field');
    await page.keyboard.press('Tab');

    await page.keyboard.type('Foo');
    await page.keyboard.press('Enter');
    await page.keyboard.press('Tab');

    await page.keyboard.type('12.34');
    await page.keyboard.press('Tab');

    await page.getByTestId('add-button').click();
    await page.getByTestId('cancel-button').click();
  });

  test('asserts that the transaction is visible at the top of the table', async () => {
    const row = page
      .getByTestId('table')
      .getByTestId('row')
      .first();

    await expect(row.getByTestId('payee')).toHaveText('Home Depot');
    await expect(row.getByTestId('notes')).toHaveText('Notes field');
    await expect(row.getByTestId('category')).toHaveText('Food');
    await expect(row.getByTestId('debit')).toHaveText('12.34');
    await expect(row.getByTestId('credit')).toHaveText('');
  });

  test('deletes the test transaction', async () => {
    const row = page
      .getByTestId('table')
      .getByTestId('row')
      .first();

    await row.getByTestId('select').click();
    await page.keyboard.press('d');
  });

  test('asserts that the transaction is no longer visible', async () => {
    const row = page
      .getByTestId('table')
      .getByTestId('row')
      .first();

    await expect(row.getByTestId('notes')).not.toHaveText('Notes field');
    await expect(row.getByTestId('debit')).not.toHaveText('12.34');
  });

  test('creates a split test transaction', async () => {
    await page.getByRole('button', { name: 'Add New' }).click();
    await page.keyboard.press('Tab');

    await page.keyboard.type('Krogger');
    await page.keyboard.press('Tab');

    await page.keyboard.type('Notes');
    await page.keyboard.press('Tab');

    await page.getByTestId('split-transaction-button').click();
    await page.keyboard.type('General');
    await page.keyboard.press('Tab');

    await page
      .getByTestId('debit')
      .nth(1)
      .click();
    await page.keyboard.type('222.22');
    await page.keyboard.press('Enter');

    await page
      .getByTestId('debit')
      .nth(2)
      .click();
    await page.keyboard.type('111.11');

    await page
      .getByTestId('debit')
      .nth(0)
      .click();
    await page.keyboard.type('333.33');
    await page.keyboard.press('Enter');

    await page.getByTestId('add-button').click();
    await page.getByTestId('cancel-button').click();
  });

  test('asserts that the split transaction is visible at the top of the table', async () => {
    const rows = page.getByTestId('table').getByTestId('row');

    await expect(rows.nth(0).getByTestId('payee')).toHaveText('Krogger');
    await expect(rows.nth(0).getByTestId('notes')).toHaveText('Notes');
    await expect(rows.nth(0).getByTestId('category')).toHaveText('Split');
    await expect(rows.nth(0).getByTestId('debit')).toHaveText('333.33');
    await expect(rows.nth(0).getByTestId('credit')).toHaveText('');

    await expect(rows.nth(1).getByTestId('payee')).toHaveText('Krogger');
    await expect(rows.nth(1).getByTestId('notes')).toHaveText('');
    await expect(rows.nth(1).getByTestId('category')).toHaveText('General');
    await expect(rows.nth(1).getByTestId('debit')).toHaveText('222.22');
    await expect(rows.nth(1).getByTestId('credit')).toHaveText('');

    await expect(rows.nth(2).getByTestId('payee')).toHaveText('Krogger');
    await expect(rows.nth(2).getByTestId('notes')).toHaveText('');
    await expect(rows.nth(2).getByTestId('category')).toHaveText('Categorize');
    await expect(rows.nth(2).getByTestId('debit')).toHaveText('111.11');
    await expect(rows.nth(2).getByTestId('credit')).toHaveText('');
  });
});
