import { test, expect } from '@playwright/test';

import { AccountPage } from './page-models/account-page';

test.describe('Transactions', () => {
  let context;
  let page;
  let accountPage;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext();
    page = await browser.newPage();
  });

  test.afterAll(async () => {
    await page.close();
    await context.close();
  });

  test.beforeAll(async () => {
    await page.goto('/');

    await page.getByRole('button', { name: 'Create test file' }).click();
    await page.getByRole('button', { name: 'Close' }).click();
  });

  test.beforeEach(async () => {
    await page.getByRole('link', { name: /^Ally Savings/ }).click();
    accountPage = new AccountPage(page);
  });

  test('creates a test transaction', async () => {
    await accountPage.createSingleTransaction({
      payee: 'Home Depot',
      notes: 'Notes field',
      category: 'Food',
      debit: '12.34'
    });

    expect(await accountPage.getNthTransaction(0)).toMatchObject({
      payee: 'Home Depot',
      notes: 'Notes field',
      category: 'Food',
      debit: '12.34',
      credit: ''
    });
  });

  test('creates a split test transaction', async () => {
    await accountPage.createSplitTransaction([
      {
        payee: 'Krogger',
        notes: 'Notes',
        debit: '333.33'
      },
      {
        category: 'General',
        debit: '222.22'
      },
      {
        debit: '111.11'
      }
    ]);

    expect(await accountPage.getNthTransaction(0)).toMatchObject({
      payee: 'Krogger',
      notes: 'Notes',
      category: 'Split',
      debit: '333.33',
      credit: ''
    });
    expect(await accountPage.getNthTransaction(1)).toMatchObject({
      payee: 'Krogger',
      notes: '',
      category: 'General',
      debit: '222.22',
      credit: ''
    });
    expect(await accountPage.getNthTransaction(2)).toMatchObject({
      payee: 'Krogger',
      notes: '',
      category: 'Categorize',
      debit: '111.11',
      credit: ''
    });
  });
});
