import { test, expect } from '@playwright/test';

import { ConfigurationPage } from './page-models/configuration-page';
import { Navigation } from './page-models/navigation';
import screenshotConfig from './screenshot.config';

test.describe('Schedules', () => {
  let page;
  let navigation;
  let schedulesPage;
  let configurationPage;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    navigation = new Navigation(page);
    configurationPage = new ConfigurationPage(page);

    await page.goto('/');
    await configurationPage.createTestFile();
  });

  test.afterAll(async () => {
    await page.close();
  });

  test.beforeEach(async () => {
    schedulesPage = await navigation.goToSchedulesPage();
  });

  test('checks the page visuals', async () => {
    await expect(page).toHaveScreenshot(screenshotConfig(page));
  });

  test('creates a new schedule, posts the transaction and later completes it', async () => {
    await schedulesPage.addNewSchedule({
      payee: 'Home Depot',
      account: 'HSBC',
      amount: 25,
    });

    expect(await schedulesPage.getNthSchedule(0)).toMatchObject({
      payee: 'Home Depot',
      account: 'HSBC',
      amount: '~25.00',
      status: 'Due',
    });
    await expect(page).toHaveScreenshot(screenshotConfig(page));

    await schedulesPage.postNthSchedule(0);
    expect(await schedulesPage.getNthSchedule(0)).toMatchObject({
      status: 'Paid',
    });
    await expect(page).toHaveScreenshot(screenshotConfig(page));

    // Go to transactions page
    const accountPage = await navigation.goToAccountPage('HSBC');
    const transaction = accountPage.getNthTransaction(0);
    await expect(transaction.payee).toHaveText('Home Depot');
    await expect(transaction.category).toHaveText('Categorize');
    await expect(transaction.debit).toHaveText('25.00');
    await expect(transaction.credit).toHaveText('');

    // go to rules page
    const rulesPage = await navigation.goToRulesPage();
    expect(await rulesPage.getNthRule(0)).toMatchObject({
      // actions: ['link schedule Home Depot (2023-02-28)'],
      actions: [
        expect.stringMatching(
          /^link schedule Home Depot \(\d{4}-\d{2}-\d{2}\)$/,
        ),
      ],
      conditions: [
        'payee is Home Depot',
        'and account is HSBC',
        expect.stringMatching(/^and date is approx Every month on the/),
        'and amount is approx -25.00',
      ],
    });

    // Go back to schedules page
    await navigation.goToSchedulesPage();
    await schedulesPage.completeNthSchedule(0);
    expect(await schedulesPage.getNthScheduleRow(0)).toHaveText(
      'Show completed schedules',
    );
  });
});
