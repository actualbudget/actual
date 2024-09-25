import { MobileAccountPage } from './mobile-account-page';

export class MobileBudgetPage {
  constructor(page) {
    this.page = page;

    this.categoryNames = page
      .getByTestId('budget-groups')
      .getByTestId('category-name');

    this.heading = page.getByRole('heading');
    this.budgetTableHeader = page.getByTestId('budget-table-header');
    this.budgetTable = page.getByTestId('budget-table');
  }

  async toggleVisibleColumns() {
    const budgetedHeaderButton = this.budgetTableHeader.getByRole('button', {
      name: 'Budgeted',
    });

    if (await budgetedHeaderButton.isVisible()) {
      await budgetedHeaderButton.click();
      return;
    }

    const spentHeaderButton = this.page.getByRole('button', { name: 'Spent' });

    if (await spentHeaderButton.isVisible()) {
      await spentHeaderButton.click();
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
    const monthButton = this.page.getByTestId('page-header-month-button');
    await monthButton.click();
  }

  async openEnvelopeBudgetSummaryMenu() {
    const toBudgetButton = this.page.getByRole('button', { name: 'To Budget' });

    if (await toBudgetButton.isVisible()) {
      await toBudgetButton.click();
      return;
    }

    const overbudgetedButton = this.page.getByRole('button', {
      name: 'Overbudgeted',
    });

    if (await overbudgetedButton.isVisible()) {
      await overbudgetedButton.click();
      return;
    }

    throw new Error(
      'To Budget/Overbudgeted button could not be located on the page',
    );
  }

  async openTrackingBudgetSummaryMenu() {
    const savedButton = this.page.getByRole('button', { name: 'Saved' });

    if ((await savedButton.count()) > 0) {
      await savedButton.click();
      return;
    }

    const projectedSavingsButton = this.page.getByRole('button', {
      name: 'Projected Savings',
    });

    if ((await projectedSavingsButton.count()) > 0) {
      await projectedSavingsButton.click();
      return;
    }

    const overspentButton = this.page.getByRole('button', {
      name: 'Overspent',
    });

    if ((await overspentButton.count()) > 0) {
      await overspentButton.click();
      return;
    }

    throw new Error(
      'Saved/Projected Savings/Overspent button could not be located on the page',
    );
  }
}
