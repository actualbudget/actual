import * as monthUtils from '@actual-app/core/shared/months';
import type { Page } from '@playwright/test';

import { expect, test } from './fixtures';
import { BudgetPage } from './page-models/budget-page';
import { ConfigurationPage } from './page-models/configuration-page';
import type { MobileBudgetPage } from './page-models/mobile-budget-page';
import { MobileNavigation } from './page-models/mobile-navigation';
import { Navigation } from './page-models/navigation';

for (const viewport of [
  { name: 'desktop', width: 1280, height: 900 },
  { name: 'mobile', width: 350, height: 600 },
]) {
  test.describe(
    'Automatic tracking budget range (' + viewport.name + ')',
    () => {
      let page: Page;
      let category: { id: string; name: string };
      let budgetPage: BudgetPage | MobileBudgetPage;

      test.beforeEach(async ({ browser }) => {
        page = await browser.newPage({ viewport });
        await page.goto('/');
        await new ConfigurationPage(page).createTestFile();
        const navigation =
          viewport.name === 'desktop'
            ? new Navigation(page)
            : new MobileNavigation(page);
        const settings = await navigation.goToSettingsPage();
        await settings.useBudgetType('Tracking');
        await expect(settings.switchBudgetTypeButton).toHaveText(
          'Switch to envelope budgeting',
        );
        budgetPage = await navigation.goToBudgetPage();
        category = await page.evaluate(async () => {
          const { list } = await window.$send('get-categories');
          const expense = list.find(item => !item.is_income && !item.hidden);
          if (!expense) throw new Error('Demo budget has no expense category');
          return { id: expense.id, name: expense.name };
        });
      });

      test.afterEach(async () => page.close());

      test('extends through entered amounts and refreshes navigation after off-screen edits, undo, and reopening', async () => {
        for (let index = 0; index < 12; index++) {
          await budgetPage.goToNextMonth();
        }
        const selected =
          budgetPage instanceof BudgetPage
            ? budgetPage.selectedMonthButton
            : budgetPage.selectedBudgetMonthButton;
        await expect(selected).toHaveAttribute('data-month', '2018-01');
        if (budgetPage instanceof BudgetPage) {
          await budgetPage.nextMonthButton.click();
        } else {
          await expect(budgetPage.nextMonthButton).toBeDisabled();
        }
        await expect(selected).toHaveAttribute('data-month', '2018-01');

        if (budgetPage instanceof BudgetPage) {
          await budgetPage.setBudgetedAmount(category.name, '2.00');
        } else {
          const menu = await budgetPage.openBudgetMenu(category.name);
          await menu.setBudgetAmount('2.00');
          await page.getByTestId('tracking-budget-menu-modal').click({
            position: { x: 5, y: 5 },
          });
          await expect(menu.locator).toBeHidden();
        }
        for (let index = 0; index < 3; index++) {
          await budgetPage.goToNextMonth();
        }
        await expect(selected).toHaveAttribute('data-month', '2018-04');
        if (budgetPage instanceof BudgetPage) {
          await budgetPage.nextMonthButton.click();
        } else {
          await expect(budgetPage.nextMonthButton).toBeDisabled();
        }
        await expect(selected).toHaveAttribute('data-month', '2018-04');

        // Simulate an allocation edit arriving while viewing a different month.
        await page.evaluate(async id => {
          await window.$send('budget/budget-amount', {
            category: id,
            month: '2018-01',
            amount: 0,
          });
        }, category.id);
        await expect(selected).toHaveAttribute('data-month', '2018-01');
        await page.keyboard.press('ControlOrMeta+z');
        await budgetPage.goToNextMonth();
        await expect(selected).toHaveAttribute('data-month', '2018-02');

        await page.reload();
        await expect(selected).toHaveAttribute('data-month', '2018-02');
        if (budgetPage instanceof BudgetPage) {
          await page.getByTitle('Previous month').click();
        } else {
          await budgetPage.goToPreviousMonth();
        }
        await expect(selected).toHaveAttribute('data-month', '2018-01');
        const amount =
          budgetPage instanceof BudgetPage
            ? budgetPage.budgetTable
                .getByTestId('row')
                .filter({ hasText: category.name })
                .first()
                .getByTestId('budget')
            : await budgetPage.getButtonForBudgeted(category.name);
        await expect(amount).toHaveText('2.00');
      });

      if (viewport.name === 'desktop') {
        test('keeps every displayed column inside the reduced range', async () => {
          await page.setViewportSize({ width: 1800, height: 900 });
          await page.evaluate(() =>
            window.$send('save-global-prefs', { maxMonths: 3 }),
          );
          await page.reload();
          const selected = page.getByTestId('selected-budget-month');
          await expect(selected).toHaveCount(3);
          for (let index = 1; index <= 10; index++) {
            await page.getByTitle('Next month').click();
            await expect(selected.first()).toHaveAttribute(
              'data-month',
              monthUtils.addMonths('2017-01', index),
            );
          }
          await new BudgetPage(page).setBudgetedAmount(
            category.name,
            '2.00',
            2,
          );
          for (let index = 11; index <= 13; index++) {
            await page.getByTitle('Next month').click();
            await expect(selected.first()).toHaveAttribute(
              'data-month',
              monthUtils.addMonths('2017-01', index),
            );
          }
          await expect(selected.last()).toHaveAttribute(
            'data-month',
            '2018-04',
          );
          await page.evaluate(async id => {
            await window.$send('budget/budget-amount', {
              category: id,
              month: '2018-01',
              amount: 0,
            });
          }, category.id);
          await expect(selected.first()).toHaveAttribute(
            'data-month',
            '2017-11',
          );
          await expect(selected.last()).toHaveAttribute(
            'data-month',
            '2018-01',
          );
        });
      }
    },
  );
}
