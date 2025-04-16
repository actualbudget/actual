import { type Locator, type Page } from '@playwright/test';

import { MobileAccountPage } from './mobile-account-page';
import { BalanceMenuModal } from './mobile-balance-menu-modal';
import { BudgetMenuModal } from './mobile-budget-menu-modal';
import { CategoryMenuModal } from './mobile-category-menu-modal';
import { EnvelopeBudgetSummaryModal } from './mobile-envelope-budget-summary-modal';
import { TrackingBudgetSummaryModal } from './mobile-tracking-budget-summary-modal';

export class MobileBudgetPage {
  readonly MONTH_HEADER_DATE_FORMAT = 'MMMM ‘yy';

  readonly page: Page;
  readonly heading: Locator;
  readonly previousMonthButton: Locator;
  readonly selectedBudgetMonthButton: Locator;
  readonly nextMonthButton: Locator;
  readonly budgetPageMenuButton: Locator;
  readonly budgetTableHeader: Locator;
  readonly toBudgetButton: Locator;
  readonly overbudgetedButton: Locator;
  readonly savedButton: Locator;
  readonly projectedSavingsButton: Locator;
  readonly overspentButton: Locator;
  readonly budgetedHeaderButton: Locator;
  readonly spentHeaderButton: Locator;
  readonly budgetTable: Locator;
  readonly categoryRows: Locator;
  readonly categoryNames: Locator;
  readonly categoryGroupRows: Locator;
  readonly categoryGroupNames: Locator;

  constructor(page: Page) {
    this.page = page;

    // Page header locators

    this.heading = page.getByRole('heading');
    this.previousMonthButton = this.heading.getByRole('button', {
      name: 'Previous month',
    });
    this.selectedBudgetMonthButton = this.heading.locator('button[data-month]');
    this.nextMonthButton = this.heading.getByRole('button', {
      name: 'Next month',
    });
    this.budgetPageMenuButton = page.getByRole('button', {
      name: 'Budget page menu',
    });

    // Budget table locators

    this.budgetTableHeader = page.getByTestId('budget-table-header');

    // Envelope budget summary buttons
    this.toBudgetButton = this.budgetTableHeader.getByRole('button', {
      name: 'To Budget',
    });
    this.overbudgetedButton = this.budgetTableHeader.getByRole('button', {
      name: 'Overbudgeted',
    });

    // Tracking budget summary buttons
    this.savedButton = this.budgetTableHeader.getByRole('button', {
      name: 'Saved',
    });
    this.projectedSavingsButton = this.budgetTableHeader.getByRole('button', {
      name: 'Projected savings',
    });
    this.overspentButton = this.budgetTableHeader.getByRole('button', {
      name: 'Overspent',
    });

    this.budgetedHeaderButton = this.budgetTableHeader.getByRole('button', {
      name: 'Budgeted',
    });
    this.spentHeaderButton = this.budgetTableHeader.getByRole('button', {
      name: 'Spent',
    });

    this.budgetTable = page.getByTestId('budget-table');

    this.categoryRows = this.budgetTable
      .getByTestId('budget-groups')
      .getByTestId('category-row');

    this.categoryNames = this.categoryRows.getByTestId('category-name');

    this.categoryGroupRows = this.budgetTable
      .getByTestId('budget-groups')
      .getByTestId('category-group-row');

    this.categoryGroupNames = this.categoryGroupRows.getByTestId(
      'category-group-name',
    );
  }

  async determineBudgetType() {
    return (await this.#getButtonForEnvelopeBudgetSummary({
      throwIfNotFound: false,
    })) !== null
      ? 'Envelope'
      : 'Tracking';
  }

  async waitFor(...options: Parameters<Locator['waitFor']>) {
    await this.budgetTable.waitFor(...options);
  }

  async toggleVisibleColumns({
    maxAttempts = 3,
  }: { maxAttempts?: number } = {}) {
    for (let i = 0; i < maxAttempts; i++) {
      if (await this.budgetedHeaderButton.isVisible()) {
        await this.budgetedHeaderButton.click();
        return;
      }
      if (await this.spentHeaderButton.isVisible()) {
        await this.spentHeaderButton.click();
        return;
      }
      await this.page.waitForTimeout(1000);
    }

    throw new Error('Budgeted/Spent columns could not be located on the page.');
  }

  async getSelectedMonth() {
    const selectedMonth = await this.heading
      .locator('[data-month]')
      .getAttribute('data-month');

    if (!selectedMonth) {
      throw new Error('Failed to get the selected month.');
    }

    return selectedMonth;
  }

  async openBudgetPageMenu() {
    await this.budgetPageMenuButton.click();
  }

  async getCategoryGroupNameForRow(idx: number) {
    const groupNameText = await this.categoryGroupNames.nth(idx).textContent();
    if (!groupNameText) {
      throw new Error(`Failed to get category group name for row ${idx}.`);
    }
    return groupNameText;
  }

  #getButtonForCategoryGroup(categoryGroupName: string | RegExp) {
    return this.categoryGroupRows.getByRole('button', {
      name: categoryGroupName,
      exact: true,
    });
  }

  async openCategoryGroupMenu(categoryGroupName: string | RegExp) {
    const categoryGroupButton =
      await this.#getButtonForCategoryGroup(categoryGroupName);
    await categoryGroupButton.click();
  }

  async getCategoryNameForRow(idx: number) {
    const categoryNameText = await this.categoryNames.nth(idx).textContent();
    if (!categoryNameText) {
      throw new Error(`Failed to get category name for row ${idx}.`);
    }
    return categoryNameText;
  }

  #getButtonForCategory(categoryName: string | RegExp) {
    return this.categoryRows.getByRole('button', {
      name: categoryName,
      exact: true,
    });
  }

  async openCategoryMenu(categoryName: string | RegExp) {
    const categoryButton = await this.#getButtonForCategory(categoryName);
    await categoryButton.click();

    return new CategoryMenuModal(
      this.page.getByRole('dialog', {
        name: 'Modal dialog',
      }),
    );
  }

  async #getButtonForCell(
    buttonType: 'Budgeted' | 'Spent',
    categoryName: string,
  ) {
    const buttonSelector =
      buttonType === 'Budgeted'
        ? `Open budget menu for ${categoryName} category`
        : `Show transactions for ${categoryName} category`;

    let button = this.budgetTable.getByRole('button', { name: buttonSelector });

    if (await button.isVisible()) {
      return button;
    }

    await this.toggleVisibleColumns();
    button = this.budgetTable.getByRole('button', { name: buttonSelector });

    if (await button.isVisible()) {
      return button;
    }

    throw new Error(
      `${buttonType} button for category ${categoryName} could not be located on the page.`,
    );
  }

  async getButtonForBudgeted(categoryName: string) {
    return await this.#getButtonForCell('Budgeted', categoryName);
  }

  async getButtonForSpent(categoryName: string) {
    return await this.#getButtonForCell('Spent', categoryName);
  }

  async openBudgetMenu(categoryName: string) {
    const budgetedButton = await this.getButtonForBudgeted(categoryName);
    await budgetedButton.click();

    return new BudgetMenuModal(
      this.page.getByRole('dialog', {
        name: 'Modal dialog',
      }),
    );
  }

  async openSpentPage(categoryName: string) {
    const spentButton = await this.getButtonForSpent(categoryName);
    await spentButton.click();

    return new MobileAccountPage(this.page);
  }

  async openBalanceMenu(categoryName: string) {
    const balanceButton = this.budgetTable.getByRole('button', {
      name: `Open balance menu for ${categoryName} category`,
    });

    if (await balanceButton.isVisible()) {
      await balanceButton.click();
      return new BalanceMenuModal(
        this.page.getByRole('dialog', {
          name: 'Modal dialog',
        }),
      );
    } else {
      throw new Error(
        `Balance button for category ${categoryName} not found or not visible.`,
      );
    }
  }

  async #waitForNewMonthToLoad({
    currentMonth,
    errorMessage,
    maxAttempts = 3,
  }: {
    currentMonth: string;
    errorMessage: string;
    maxAttempts: number;
  }) {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const newMonth = await this.getSelectedMonth();
      if (newMonth !== currentMonth) {
        return newMonth;
      }
      await this.page.waitForTimeout(500);
    }

    throw new Error(errorMessage);
  }

  async goToPreviousMonth({ maxAttempts = 3 }: { maxAttempts?: number } = {}) {
    const currentMonth = await this.getSelectedMonth();

    await this.previousMonthButton.click();

    return await this.#waitForNewMonthToLoad({
      currentMonth,
      maxAttempts,
      errorMessage:
        'Failed to navigate to the previous month after maximum attempts.',
    });
  }

  async openMonthMenu() {
    await this.selectedBudgetMonthButton.click();
  }

  async goToNextMonth({ maxAttempts = 3 }: { maxAttempts?: number } = {}) {
    const currentMonth = await this.getSelectedMonth();

    await this.nextMonthButton.click();

    return await this.#waitForNewMonthToLoad({
      currentMonth,
      maxAttempts,
      errorMessage:
        'Failed to navigate to the next month after maximum attempts.',
    });
  }

  async #getButtonForEnvelopeBudgetSummary({
    throwIfNotFound = true,
  }: { throwIfNotFound?: boolean } = {}) {
    if (await this.toBudgetButton.isVisible()) {
      return this.toBudgetButton;
    }

    if (await this.overbudgetedButton.isVisible()) {
      return this.overbudgetedButton;
    }

    if (!throwIfNotFound) {
      return null;
    }

    throw new Error(
      'Neither “To Budget” nor “Overbudgeted” button could be located on the page.',
    );
  }

  async openEnvelopeBudgetSummary() {
    const budgetSummaryButton = await this.#getButtonForEnvelopeBudgetSummary();
    if (!budgetSummaryButton) {
      throw new Error('Envelope budget summary button not found.');
    }
    await budgetSummaryButton.click();

    return new EnvelopeBudgetSummaryModal(
      this.page.getByRole('dialog', {
        name: 'Modal dialog',
      }),
    );
  }

  async #getButtonForTrackingBudgetSummary({
    throwIfNotFound = true,
  }: { throwIfNotFound?: boolean } = {}) {
    if (await this.savedButton.isVisible()) {
      return this.savedButton;
    }

    if (await this.projectedSavingsButton.isVisible()) {
      return this.projectedSavingsButton;
    }

    if (await this.overspentButton.isVisible()) {
      return this.overspentButton;
    }

    if (!throwIfNotFound) {
      return null;
    }

    throw new Error(
      'None of “Saved”, “Projected savings”, or “Overspent” buttons could be located on the page.',
    );
  }

  async openTrackingBudgetSummary() {
    const budgetSummaryButton = await this.#getButtonForTrackingBudgetSummary();
    if (!budgetSummaryButton) {
      throw new Error('Tracking budget summary button not found.');
    }
    await budgetSummaryButton.click();

    return new TrackingBudgetSummaryModal(
      this.page.getByRole('dialog', {
        name: 'Modal dialog',
      }),
    );
  }
}
