import { MobileAccountPage } from './mobile-account-page';

export class MobileBudgetPage {
  constructor(page) {
    this.page = page;

    this.initializePageHeaderLocators(page);
    this.initializeBudgetTableLocators(page);

    this.budgetType = this.determineBudgetType();
  }

  determineBudgetType() {
    return this.getEnvelopeBudgetSummaryButton({
      throwIfNotFound: false,
    }) !== null
      ? 'Envelope'
      : 'Tracking';
  }

  initializeBudgetTableLocators(page) {
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

    this.categoryRows = page
      .getByTestId('budget-groups')
      .getByTestId('category-row');

    this.categoryNames = this.categoryRows.getByTestId('category-name');

    this.categoryGroupRows = page
      .getByTestId('budget-groups')
      .getByTestId('category-group-row');

    this.categoryGroupNames = this.categoryGroupRows.getByTestId(
      'category-group-name',
    );
  }

  initializePageHeaderLocators(page) {
    this.heading = page.getByRole('heading');
    this.previousMonthButton = this.heading.getByRole('button', {
      name: 'Previous month',
    });
    this.selectedBudgetMonthButton = this.heading.getByRole('button', {
      name: 'Selected budget month',
    });
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
    return this.selectedBudgetMonthButton.getAttribute('data-month');
  }

  async openBudgetPageMenu() {
    await this.budgetPageMenuButton.click();
  }

  async getCategoryGroupNameForRow(idx) {
    return this.categoryGroupNames.nth(idx).textContent();
  }

  getCategoryGroupButton(categoryGroupName) {
    return this.categoryGroupRows.getByRole('button', {
      name: categoryGroupName,
      exact: true,
    });
  }

  async openCategoryGroupMenu(categoryGroupName) {
    const categoryGroupButton =
      await this.getCategoryGroupButton(categoryGroupName);
    await categoryGroupButton.click();
  }

  async getCategoryNameForRow(idx) {
    return this.categoryNames.nth(idx).textContent();
  }

  getCategoryButton(categoryName) {
    return this.categoryRows.getByRole('button', {
      name: categoryName,
      exact: true,
    });
  }

  async openCategoryMenu(categoryName) {
    const categoryButton = await this.getCategoryButton(categoryName);
    await categoryButton.click();
  }

  async getCellButton(buttonType, categoryName) {
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

  async getBudgetCellButton(categoryName) {
    return this.getCellButton('Budgeted', categoryName);
  }

  async getSpentCellButton(categoryName) {
    return this.getCellButton('Spent', categoryName);
  }

  async openBudgetMenu(categoryName) {
    const budgetedButton = await this.getBudgetCellButton(categoryName);
    await budgetedButton.click();
  }

  async setBudget(categoryName, newAmount) {
    const budgetedButton = await this.getBudgetCellButton(categoryName);
    await budgetedButton.click();

    await this.page.keyboard.type(String(newAmount));
    await this.page.keyboard.press('Enter');
  }

  async openSpentPage(categoryName) {
    const spentButton = await this.getSpentCellButton(categoryName);
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

  async goToPreviousMonth() {
    await this.previousMonthButton.click();
  }

  async openMonthMenu() {
    await this.selectedBudgetMonthButton.click();
  }

  async goToNextMonth() {
    await this.nextMonthButton.click();
  }

  async getEnvelopeBudgetSummaryButton({ throwIfNotFound = true } = {}) {
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
    const budgetSummaryButton = await this.getEnvelopeBudgetSummaryButton();
    await budgetSummaryButton.click();
  }

  async getTrackingBudgetSummaryButton({ throwIfNotFound = true } = {}) {
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
    const budgetSummaryButton = await this.getTrackingBudgetSummaryButton();
    await budgetSummaryButton.click();
  }
}
