import type { Page } from '@playwright/test';

import { expect, test } from './fixtures';
import { BudgetPage } from './page-models/budget-page';
import { ConfigurationPage } from './page-models/configuration-page';
import type { MobileBudgetPage } from './page-models/mobile-budget-page';
import { MobileNavigation } from './page-models/mobile-navigation';
import { Navigation } from './page-models/navigation';

async function setBudgetAmount(page: Page, month: string, amount: number) {
  await page.evaluate(
    async ({ month, amount }) => {
      const { list } = await window.$send('get-categories');
      const category = list.find(item => !item.is_income && !item.hidden);
      if (!category) {
        throw new Error('Demo budget has no expense category');
      }
      await window.$send('budget/budget-amount', {
        category: category.id,
        month,
        amount,
      });
    },
    { month, amount },
  );
}

for (const viewport of [
  { name: 'desktop', width: 1280, height: 900 },
  { name: 'mobile', width: 350, height: 600 },
]) {
  test.describe(`Automatic budget range (${viewport.name})`, () => {
    let page: Page;
    let budgetPage: BudgetPage | MobileBudgetPage;

    test.beforeEach(async ({ browser }) => {
      page = await browser.newPage({ viewport });
      await page.goto('/');
      await new ConfigurationPage(page).createTestFile();
      const navigation =
        viewport.name === 'desktop'
          ? new Navigation(page)
          : new MobileNavigation(page);
      budgetPage = await navigation.goToBudgetPage();
    });

    test.afterEach(async () => page.close());

    test('extends after budgeting the last month and shrinks on reload', async () => {
      const selected =
        budgetPage instanceof BudgetPage
          ? budgetPage.selectedMonthButton
          : budgetPage.selectedBudgetMonthButton;

      async function expectLastMonth(month: string) {
        if (budgetPage instanceof BudgetPage) {
          await budgetPage.nextMonthButton.click();
        } else {
          await expect(budgetPage.nextMonthButton).toBeDisabled();
        }
        await expect(selected).toHaveAttribute('data-month', month);
      }

      // The test clock is January 2017, so the default range ends 12 months later
      for (let index = 0; index < 12; index++) {
        await budgetPage.goToNextMonth();
      }
      await expectLastMonth('2018-01');

      await setBudgetAmount(page, '2018-01', 200);
      for (let index = 0; index < 3; index++) {
        await budgetPage.goToNextMonth();
      }
      await expectLastMonth('2018-04');

      // Clearing the amount keeps the range while the budget is open...
      await setBudgetAmount(page, '2018-01', 0);
      await expect(selected).toHaveAttribute('data-month', '2018-04');

      // ...and shrinks it the next time the budget loads
      await page.reload();
      await expect(selected).toHaveAttribute('data-month', '2018-01');
    });

    if (viewport.name === 'desktop') {
      test('keeps every displayed column inside the range', async () => {
        await page.setViewportSize({ width: 1800, height: 900 });
        await page.evaluate(() =>
          window.$send('save-global-prefs', { maxMonths: 3 }),
        );
        await setBudgetAmount(page, '2018-01', 200);
        await page.reload();

        const selected = page.getByTestId('selected-budget-month');
        await expect(selected).toHaveCount(3);
        for (let index = 0; index < 14; index++) {
          await page.getByTitle('Next month').click();
        }
        await expect(selected.last()).toHaveAttribute('data-month', '2018-04');

        await setBudgetAmount(page, '2018-01', 0);
        await page.reload();
        await expect(selected.first()).toHaveAttribute('data-month', '2017-11');
        await expect(selected.last()).toHaveAttribute('data-month', '2018-01');
      });
    }
  });
}
