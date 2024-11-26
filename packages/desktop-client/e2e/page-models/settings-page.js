export class SettingsPage {
  constructor(page) {
    this.page = page;
  }

  async exportData() {
    await this.page.getByRole('button', { name: 'Export data' }).click();
  }

  async useBudgetType(budgetType) {
    const switchBudgetTypeButton = this.page.getByRole('button', {
      name: `Switch to ${budgetType} budgeting`,
    });

    await switchBudgetTypeButton.click();
  }
}
