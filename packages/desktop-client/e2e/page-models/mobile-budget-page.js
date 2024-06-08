export class MobileBudgetPage {
  constructor(page) {
    this.page = page;

    this.categoryNames = page
      .getByTestId('budget-groups')
      .getByTestId('category-name');
  }
}
