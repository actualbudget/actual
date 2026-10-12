import { expect } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';

import { CategoryActionsSheet } from './mobile-category-actions-sheet';
import { CategoryGroupActionsSheet } from './mobile-category-group-actions-sheet';
import { MobileCategoryPage } from './mobile-category-page';
import { EnvelopeBudgetSummaryModal } from './mobile-envelope-budget-summary-modal';
import { TrackingBudgetSummaryModal } from './mobile-tracking-budget-summary-modal';

const LONG_PRESS_DELAY_MS = 700;

export class MobileBudgetPage {
  readonly MONTH_HEADER_DATE_FORMAT = "MMMM ''yy";

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

  async #getButtonForCategoryGroup(categoryGroupName: string | RegExp) {
    return this.categoryGroupRows.getByRole('button', {
      name: categoryGroupName,
      exact: true,
    });
  }

  async openCategoryGroupActions(categoryGroupName: string | RegExp) {
    const categoryGroupButton =
      await this.#getButtonForCategoryGroup(categoryGroupName);
    await categoryGroupButton.click();

    return new CategoryGroupActionsSheet(this.page.getByRole('dialog'));
  }

  async getCategoryNameForRow(idx: number) {
    const categoryNameText = await this.categoryNames.nth(idx).textContent();
    if (!categoryNameText) {
      throw new Error(`Failed to get category name for row ${idx}.`);
    }
    return categoryNameText;
  }

  async #getRowForCategory(categoryName: string | RegExp) {
    return this.budgetTable.getByTestId('budget-groups').getByRole('row', {
      name:
        typeof categoryName === 'string'
          ? `Open ${categoryName} category`
          : categoryName,
      exact: true,
    });
  }

  async openCategory(categoryName: string | RegExp) {
    const categoryRow = await this.#getRowForCategory(categoryName);
    await categoryRow.click();

    const categoryPage = new MobileCategoryPage(this.page);
    await categoryPage.waitFor();
    return categoryPage;
  }

  async openCategoryActionsWithLongPress(categoryName: string | RegExp) {
    const categoryRow = await this.#getRowForCategory(categoryName);
    await categoryRow.click({ delay: LONG_PRESS_DELAY_MS });

    return new CategoryActionsSheet(this.page.getByRole('dialog'));
  }

  async #getButtonForCell(
    buttonType: 'Budgeted' | 'Spent',
    categoryName: string,
  ) {
    const buttonSelector =
      buttonType === 'Budgeted'
        ? `Budgeted amount for ${categoryName} category`
        : `Spent amount for ${categoryName} category`;

    let button = this.budgetTable.getByLabel(buttonSelector, { exact: true });

    if (await button.isVisible()) {
      return button;
    }

    await this.toggleVisibleColumns();
    button = this.budgetTable.getByLabel(buttonSelector, { exact: true });

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

  async openCategoryFromBudgeted(categoryName: string) {
    const budgetedButton = await this.getButtonForBudgeted(categoryName);
    await budgetedButton.click();

    const categoryPage = new MobileCategoryPage(this.page);
    await categoryPage.waitFor();
    return categoryPage;
  }

  async openCategoryFromSpent(categoryName: string) {
    const spentButton = await this.getButtonForSpent(categoryName);
    await spentButton.click();

    const categoryPage = new MobileCategoryPage(this.page);
    await categoryPage.waitFor();
    return categoryPage;
  }

  async openCategoryFromBalance(categoryName: string) {
    const balanceCell = this.budgetTable.getByLabel(
      `Balance for ${categoryName} category`,
      { exact: true },
    );

    if (await balanceCell.isVisible()) {
      await balanceCell.click();
      const categoryPage = new MobileCategoryPage(this.page);
      await categoryPage.waitFor();
      return categoryPage;
    } else {
      throw new Error(
        `Balance cell for category ${categoryName} not found or not visible.`,
      );
    }
  }

  async #waitForNewMonthToLoad({
    currentMonth,
    errorMessage,
  }: {
    currentMonth: string;
    errorMessage: string;
  }) {
    await expect(
      this.heading.locator('[data-month]'),
      errorMessage,
    ).not.toHaveAttribute('data-month', currentMonth);

    return this.getSelectedMonth();
  }

  async goToPreviousMonth() {
    const currentMonth = await this.getSelectedMonth();

    await this.previousMonthButton.click();

    return await this.#waitForNewMonthToLoad({
      currentMonth,
      errorMessage: 'Failed to navigate to the previous month.',
    });
  }

  async openMonthMenu() {
    await this.selectedBudgetMonthButton.click();
  }

  async goToNextMonth() {
    const currentMonth = await this.getSelectedMonth();

    await this.nextMonthButton.click();

    return await this.#waitForNewMonthToLoad({
      currentMonth,
      errorMessage: 'Failed to navigate to the next month.',
    });
  }

  async #getButtonForEnvelopeBudgetSummary({
    throwIfNotFound = true,
  }: { throwIfNotFound?: boolean } = {}) {
    const button = this.toBudgetButton.or(this.overbudgetedButton).first();
    try {
      await button.waitFor();
    } catch (err) {
      if (!throwIfNotFound) return null;
      throw err;
    }
    return button;
  }

  async openEnvelopeBudgetSummary() {
    const budgetSummaryButton = await this.#getButtonForEnvelopeBudgetSummary();
    if (!budgetSummaryButton) {
      throw new Error('Envelope budget summary button not found.');
    }
    await budgetSummaryButton.click();

    return new EnvelopeBudgetSummaryModal(this.page.getByRole('dialog'));
  }

  async #getButtonForTrackingBudgetSummary({
    throwIfNotFound = true,
  }: { throwIfNotFound?: boolean } = {}) {
    const button = this.savedButton
      .or(this.projectedSavingsButton)
      .or(this.overspentButton)
      .first();
    try {
      await button.waitFor();
    } catch (err) {
      if (!throwIfNotFound) return null;
      throw err;
    }
    return button;
  }

  async openTrackingBudgetSummary() {
    const budgetSummaryButton = await this.#getButtonForTrackingBudgetSummary();
    if (!budgetSummaryButton) {
      throw new Error('Tracking budget summary button not found.');
    }
    await budgetSummaryButton.click();

    return new TrackingBudgetSummaryModal(this.page.getByRole('dialog'));
  }
}
