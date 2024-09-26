import { MobileAccountPage } from './mobile-account-page';

export class MobileBudgetPage {
  constructor(page) {
    this.page = page;

    this.categoryNames = page
      .getByTestId('budget-groups')
      .getByTestId('category-name');

    this.heading = page.getByRole('heading');
    this.selectedBudgetMonthButton = this.heading.getByLabel(
      'Selected budget month',
    );

    this.budgetTableHeader = page.getByTestId('budget-table-header');

    this.toBudgetButton = this.budgetTableHeader.getByRole('button', {
      name: 'To Budget',
    });
    this.overbudgetedButton = this.budgetTableHeader.getByRole('button', {
      name: 'Overbudgeted',
    });

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
    this.spentHeaderButton = this.page.getByRole('button', { name: 'Spent' });

    this.budgetTable = page.getByTestId('budget-table');
    this.budgetType =
      this.getEnvelopeBudgetSummaryButton({
        throwIfNotFound: false,
      }) !== null
        ? 'Envelope'
        : 'Tracking';
  }

  async toggleVisibleColumns() {
    if (await this.budgetedHeaderButton.isVisible()) {
      await this.budgetedHeaderButton.click();
      return;
    }

    if (await this.spentHeaderButton.isVisible()) {
      await this.spentHeaderButton.click();
      return;
    }

    throw new Error('Budgeted/Spent columns could not be located on the page');
  }

  async getBudgetedButton(categoryName) {
    let budgetedButton = this.page.getByTestId(
      `budgeted-${categoryName}-button`,
    );

    if (await budgetedButton.isVisible()) {
      return budgetedButton;
    }

    await this.toggleVisibleColumns();
    budgetedButton = await this.getBudgetedButton(categoryName);

    if (await budgetedButton.isVisible()) {
      return budgetedButton;
    }

    throw new Error(
      `Budget button for category ${categoryName} could not be located on the page`,
    );
  }

  async openBudgetMenu(categoryName) {
    const budgetedButton = await this.getBudgetedButton(categoryName);
    await budgetedButton.click();
  }

  async setBudget(categoryName, newAmount) {
    const budgetedButton = await this.getBudgetedButton(categoryName);
    await budgetedButton.click();

    await this.page.keyboard.type(String(newAmount));
    await this.page.keyboard.press('Enter');
  }

  async getSpentButton(categoryName) {
    let spentButton = this.page.getByTestId(`spent-${categoryName}-button`);

    if ((await spentButton.count()) > 0 && (await spentButton.isVisible())) {
      return spentButton;
    }

    await this.toggleVisibleColumns();
    spentButton = await this.getSpentButton(categoryName);

    if ((await spentButton.count()) > 0) {
      return spentButton;
    }

    throw new Error(
      `Spent button for category ${categoryName} could not be located on the page`,
    );
  }

  async openSpentPage(categoryName) {
    const spentButton = await this.getSpentButton(categoryName);
    await spentButton.click();

    return new MobileAccountPage(this.page);
  }

  async openBalanceMenu(categoryName) {
    const balanceButton = this.page.getByTestId(
      `balance-${categoryName}-button`,
    );
    await balanceButton.click();
  }

  async openMonthMenu() {
    await this.selectedBudgetMonthButton.click();
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
      'To Budget/Overbudgeted button could not be located on the page',
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
      'Saved/Projected Savings/Overspent button could not be located on the page',
    );
  }

  async openTrackingBudgetSummaryMenu() {
    const budgetSummaryButton = await this.getTrackingBudgetSummaryButton();
    await budgetSummaryButton.click();
  }
}
