export class BudgetMenuModal {
  constructor(page, locator) {
    this.page = page;
    this.locator = locator;

    this.heading = locator.getByRole('heading');
    this.budgetAmountInput = locator.getByTestId('amount-input');
    this.copyLastMonthBudgetButton = locator.getByRole('button', {
      name: 'Copy last month’s budget',
    });
    this.setTo3MonthAverageButton = locator.getByRole('button', {
      name: 'Set to 3 month average',
    });
    this.setTo6MonthAverageButton = locator.getByRole('button', {
      name: 'Set to 6 month average',
    });
    this.setToYearlyAverageButton = locator.getByRole('button', {
      name: 'Set to yearly average',
    });
    this.applyBudgetTemplateButton = locator.getByRole('button', {
      name: 'Apply budget template',
    });
  }

  async close() {
    await this.heading.getByRole('button', { name: 'Close' }).click();
  }

  async setBudgetAmount(newAmount) {
    await this.budgetAmountInput.fill(String(newAmount));
    await this.budgetAmountInput.blur();
    await this.close();
  }

  async copyLastMonthBudget() {
    await this.copyLastMonthBudgetButton.click();
  }

  async setTo3MonthAverage() {
    await this.setTo3MonthAverageButton.click();
  }

  async setTo6MonthAverage() {
    await this.setTo6MonthAverageButton.click();
  }

  async setToYearlyAverage() {
    await this.setToYearlyAverageButton.click();
  }

  async applyBudgetTemplate() {
    await this.applyBudgetTemplateButton.click();
  }
}
