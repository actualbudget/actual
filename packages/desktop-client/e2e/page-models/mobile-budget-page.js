import { MobileAccountPage } from './mobile-account-page';
import { MobileNavigation } from './mobile-navigation';

export class MobileBudgetPage {
  constructor(page) {
    this.page = page;

    this.categoryNames = page
      .getByTestId('budget-groups')
      .getByTestId('category-name');

    this.budgetTableHeader = page.getByTestId('budget-table-header');
    this.budgetTable = page.getByTestId('budget-table');
    this.navigation = new MobileNavigation(page);
  }

  async toggleVisibleColumns() {
    const budgetedHeaderButton = this.budgetTableHeader.getByRole('button', {
      name: 'Budgeted',
    });

    if ((await budgetedHeaderButton.count()) > 0) {
      await budgetedHeaderButton.click();
      return;
    }

    const spentHeaderButton = this.page.getByRole('button', { name: 'Spent' });

    if ((await spentHeaderButton.count()) > 0) {
      await spentHeaderButton.click();
      return;
    }

    throw new Error('Budgeted/Spent columns could not be located');
  }

  async getBudgetedButton(categoryName) {
    let budgetedButton = this.page.getByTestId(
      `budgeted-${categoryName}-button`,
    );

    if ((await budgetedButton.count()) > 0) {
      return budgetedButton;
    }

    await this.toggleVisibleColumns();
    budgetedButton = await this.getBudgetedButton(categoryName);

    if ((await budgetedButton.count()) > 0) {
      return budgetedButton;
    }

    throw new Error(
      `Budget button for category ${categoryName} could not be located`,
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

    if ((await spentButton.count()) > 0) {
      return spentButton;
    }

    await this.toggleVisibleColumns();
    spentButton = await this.getSpentButton(categoryName);

    if ((await spentButton.count()) > 0) {
      return spentButton;
    }

    throw new Error(
      `Spent button for category ${categoryName} could not be located`,
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

    if ((await toBudgetButton.count()) > 0) {
      await toBudgetButton.click();
      return;
    }

    const overbudgetedButton = this.page.getByRole('button', {
      name: 'Overbudgeted',
    });

    if ((await overbudgetedButton.count()) > 0) {
      await overbudgetedButton.click();
      return;
    }
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
  }
}
