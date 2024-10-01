import { MobileAccountPage } from './mobile-account-page';
import { BudgetMenuModal } from './mobile-budget-menu-modal';

export class MobileBudgetPage {
  MONTH_HEADER_DATE_FORMAT = 'MMMM ‘yy';

  constructor(page) {
    this.page = page;

    this.#initializePageHeaderLocators(page);
    this.#initializeBudgetTableLocators(page);
  }

  async determineBudgetType() {
    return (await this.#getButtonForEnvelopeBudgetSummary({
      throwIfNotFound: false,
    })) !== null
      ? 'Envelope'
      : 'Tracking';
  }

  #initializeBudgetTableLocators(page) {
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
      name: 'Projected Savings',
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

  #initializePageHeaderLocators(page) {
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
  }

  async waitForBudgetTable() {
    await this.budgetTable.waitFor();
  }

  async toggleVisibleColumns(maxAttempts = 3) {
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

    throw new Error('Budgeted/Spent columns could not be located on the page');
  }

  async getSelectedMonth() {
    return await this.heading
      .locator('[data-month]')
      .getAttribute('data-month');
  }

  async openBudgetPageMenu() {
    await this.budgetPageMenuButton.click();
  }

  async getCategoryGroupNameForRow(idx) {
    return this.categoryGroupNames.nth(idx).textContent();
  }

  #getButtonForCategoryGroup(categoryGroupName) {
    return this.categoryGroupRows.getByRole('button', {
      name: categoryGroupName,
      exact: true,
    });
  }

  async openCategoryGroupMenu(categoryGroupName) {
    const categoryGroupButton =
      await this.#getButtonForCategoryGroup(categoryGroupName);
    await categoryGroupButton.click();
  }

  async getCategoryNameForRow(idx) {
    return this.categoryNames.nth(idx).textContent();
  }

  #getButtonForCategory(categoryName) {
    return this.categoryRows.getByRole('button', {
      name: categoryName,
      exact: true,
    });
  }

  async openCategoryMenu(categoryName) {
    const categoryButton = await this.#getButtonForCategory(categoryName);
    await categoryButton.click();
  }

  async #getButtonForCell(buttonType, categoryName) {
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
      `${buttonType} button for category ${categoryName} could not be located on the page`,
    );
  }

  async getButtonForBudgeted(categoryName) {
    return await this.#getButtonForCell('Budgeted', categoryName);
  }

  async getButtonForSpent(categoryName) {
    return await this.#getButtonForCell('Spent', categoryName);
  }

  async openBudgetMenu(categoryName) {
    const budgetedButton = await this.getButtonForBudgeted(categoryName);
    await budgetedButton.click();

    return new BudgetMenuModal(this.page, this.page.getByRole('dialog'));
  }

  async openSpentPage(categoryName) {
    const spentButton = await this.getButtonForSpent(categoryName);
    await spentButton.click();

    return new MobileAccountPage(this.page);
  }

  async openBalanceMenu(categoryName) {
    const balanceButton = this.budgetTable.getByRole('button', {
      name: `Open balance menu for ${categoryName} category`,
    });

    if (await balanceButton.isVisible()) {
      await balanceButton.click();
    } else {
      throw new Error(
        `Balance button for category ${categoryName} not found or not visible`,
      );
    }
  }

  async #waitForNewMonthToLoad({
    currentMonth,
    errorMessage,
    maxAttempts = 3,
  } = {}) {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const newMonth = await this.getSelectedMonth();
      if (newMonth !== currentMonth) {
        return newMonth;
      }
      await this.page.waitForTimeout(500);
    }

    throw new Error(errorMessage);
  }

  async goToPreviousMonth({ maxAttempts = 3 } = {}) {
    const currentMonth = await this.getSelectedMonth();

    await this.previousMonthButton.click();

    return await this.#waitForNewMonthToLoad({
      currentMonth,
      maxAttempts,
      errorMessage:
        'Failed to navigate to the previous month after maximum attempts',
    });
  }

  async openMonthMenu() {
    await this.selectedBudgetMonthButton.click();
  }

  async goToNextMonth({ maxAttempts = 3 } = {}) {
    const currentMonth = await this.getSelectedMonth();

    await this.nextMonthButton.click();

    return await this.#waitForNewMonthToLoad({
      currentMonth,
      maxAttempts,
      errorMessage:
        'Failed to navigate to the next month after maximum attempts',
    });
  }

  async #getButtonForEnvelopeBudgetSummary({ throwIfNotFound = true } = {}) {
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
      'Neither “To Budget” nor “Overbudgeted” button could be located on the page',
    );
  }

  async openEnvelopeBudgetSummaryMenu() {
    const budgetSummaryButton = await this.#getButtonForEnvelopeBudgetSummary();
    await budgetSummaryButton.click();
  }

  async #getButtonForTrackingBudgetSummary({ throwIfNotFound = true } = {}) {
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
      'None of “Saved”, “Projected Savings”, or “Overspent” buttons could be located on the page',
    );
  }

  async openTrackingBudgetSummaryMenu() {
    const budgetSummaryButton = await this.#getButtonForTrackingBudgetSummary();
    await budgetSummaryButton.click();
  }
}
