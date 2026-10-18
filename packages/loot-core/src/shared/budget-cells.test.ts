import { findCategoryMonthCell } from './budget-cells';

describe('findCategoryMonthCell', () => {
  const monthData = [
    { name: 'budget202611!budget-food', value: 20000 },
    { name: 'budget202611!budget-total-food', value: 41000 },
    { name: 'budget202611!budget-food-USD', value: 15000 },
    { name: 'budget202611!sum-amount-food', value: -6000 },
    { name: 'budget202611!group-budget-food', value: 1 },
    { name: 'budget202611!budget-rent', value: 90000 },
  ];

  it('prefers the total of a category budgeted in several currencies', () => {
    expect(findCategoryMonthCell(monthData, 'budget', 'food')?.value).toBe(
      41000,
    );
  });

  it('uses the category itself otherwise', () => {
    expect(findCategoryMonthCell(monthData, 'budget', 'rent')?.value).toBe(
      90000,
    );
    expect(findCategoryMonthCell(monthData, 'sum-amount', 'food')?.value).toBe(
      -6000,
    );
  });

  it('matches the whole cell name', () => {
    expect(findCategoryMonthCell(monthData, 'leftover', 'food')).toBe(
      undefined,
    );
  });
});
