import { MobileNavigation } from './mobile-navigation';

export class MobileBudgetPage {
  constructor(page) {
    this.page = page;

    this.categoryNames = page
      .getByTestId('budget-groups')
      .getByTestId('category-name');

    this.navigation = new MobileNavigation(page);
  }

  async toggleVisibleColumns() {
    // await this.page.getByTestId('toggle-budget-table-columns').click();
    const budgetTableHeader = this.page.getByTestId('budget-table-header');
    const budgetedHeaderButton = budgetTableHeader
      .getByRole('button', {
        name: 'Budgeted',
      })
      .locator('visible=true');

    if ((await budgetedHeaderButton.count()) > 0) {
      await budgetedHeaderButton.click();
      return;
    }

    const spentHeaderButton = this.page
      .getByRole('button', { name: 'Spent' })
      .locator('visible=true');
    await spentHeaderButton.click();
  }

  async getBudgetedButton(categoryName) {
    let budgetedButton = this.page
      .getByTestId(`budgeted-${categoryName}-button`)
      .locator('visible=true');

    if ((await budgetedButton.count()) === 0) {
      await this.toggleVisibleColumns();
      budgetedButton = await this.getBudgetedButton(categoryName);
    }

    return budgetedButton;
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
    let budgetedButton = this.page
      .getByTestId(`spent-${categoryName}-button`)
      .locator('visible=true');

    if ((await budgetedButton.count()) === 0) {
      await this.toggleVisibleColumns();
      budgetedButton = await this.getSpentButton(categoryName);
    }

    return budgetedButton;
  }

  async openSpentPage(categoryName) {
    const spentButton = await this.getSpentButton(categoryName);
    await spentButton.click();
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
    const toBudgetButtonExists = (await toBudgetButton.count()) > 0;
    if (toBudgetButtonExists) {
      await toBudgetButton.click();
      return;
    }

    const overbudgetedButton = this.page.getByRole('button', {
      name: 'Overbudgeted',
    });
    const overbudgetedButtonExists = (await overbudgetedButton.count()) > 0;
    if (overbudgetedButtonExists) {
      await overbudgetedButton.click();
      return;
    }
  }

  async openTrackingBudgetSummaryMenu() {
    const savedButton = this.page.getByRole('button', { name: 'Saved' });
    const savedButtonExists = (await savedButton.count()) > 0;
    if (savedButtonExists) {
      await savedButton.click();
      return;
    }

    const projectedSavingsButton = this.page.getByRole('button', {
      name: 'Projected Savings',
    });
    const projectedSavingsButtonExists =
      (await projectedSavingsButton.count()) > 0;
    if (projectedSavingsButtonExists) {
      await projectedSavingsButton.click();
      return;
    }

    const overspentButton = this.page.getByRole('button', {
      name: 'Overspent',
    });
    const overspentButtonExists = (await overspentButton.count()) > 0;
    if (overspentButtonExists) {
      await overspentButton.click();
      return;
    }
  }
}
