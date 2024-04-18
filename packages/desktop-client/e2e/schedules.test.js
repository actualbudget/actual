import { test, expect } from '@playwright/test';

import { ConfigurationPage } from './page-models/configuration-page';
import { Navigation } from './page-models/navigation';

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
    await expect(page).toMatchThemeScreenshots();
  });

  test('creates a new schedule, posts the transaction and later completes it', async () => {
    await schedulesPage.addNewSchedule({
      payee: 'Home Depot',
      account: 'HSBC',
      amount: 25,
    });

    const schedule = schedulesPage.getNthSchedule(2);
    await expect(schedule.payee).toHaveText('Home Depot');
    await expect(schedule.account).toHaveText('HSBC');
    await expect(schedule.amount).toHaveText('~25.00');
    await expect(schedule.status).toHaveText('Due');
    await expect(page).toMatchThemeScreenshots();

    await schedulesPage.postNthSchedule(2);
    await expect(schedulesPage.getNthSchedule(2).status).toHaveText('Paid');
    await expect(page).toMatchThemeScreenshots();

    // Go to transactions page
    const accountPage = await navigation.goToAccountPage('HSBC');
    const transaction = accountPage.getNthTransaction(0);
    await expect(transaction.payee).toHaveText('Home Depot');
    await expect(transaction.category).toHaveText('Categorize');
    await expect(transaction.debit).toHaveText('25.00');
    await expect(transaction.credit).toHaveText('');

    // go to rules page
    const rulesPage = await navigation.goToRulesPage();
    await rulesPage.searchFor('Home Depot');
    const rule = rulesPage.getNthRule(0);
    await expect(rule.actions).toHaveText([
      'link schedule Home Depot (2017-01-01)',
    ]);
    await expect(rule.conditions).toHaveText([
      'payee is Home Depot',
      'and account is HSBC',
      'and date is approx Every month on the 1st',
      'and amount is approx -25.00',
    ]);

    // Go back to schedules page
    await navigation.goToSchedulesPage();
    await schedulesPage.completeNthSchedule(2);
    await expect(schedulesPage.getNthScheduleRow(4)).toHaveText(
      'Show completed schedules',
    );
    await expect(page).toMatchThemeScreenshots();

    // Schedules search shouldn't shrink with many schedules
    for (let i = 0; i < 10; i++) {
      await schedulesPage.addNewSchedule({
        payee: 'Home Depot',
        account: 'HSBC',
        amount: 0,
      });
    }
    await expect(page).toMatchThemeScreenshots();
  });
});
