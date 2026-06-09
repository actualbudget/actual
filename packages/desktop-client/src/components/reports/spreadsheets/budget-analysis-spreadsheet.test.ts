import type { CategoryEntity } from '@actual-app/core/types/models';

function filterBaseCategories(
  categories: CategoryEntity[],
  showHiddenCategories: boolean,
): CategoryEntity[] {
  return categories.filter(
    cat => !cat.is_income && (showHiddenCategories || !cat.hidden),
  );
}

const makeCategory = (
  overrides: Partial<CategoryEntity> & Pick<CategoryEntity, 'id' | 'name'>,
): CategoryEntity => ({
  is_income: false,
  hidden: false,
  group: 'group1',
  ...overrides,
});

const visibleExpense = makeCategory({ id: 'c1', name: 'Groceries' });
const hiddenExpense = makeCategory({
  id: 'c2',
  name: 'Car Fund',
  hidden: true,
});
const incomeCategory = makeCategory({
  id: 'c3',
  name: 'Salary',
  is_income: true,
});
const hiddenIncome = makeCategory({
  id: 'c4',
  name: 'Hidden Income',
  is_income: true,
  hidden: true,
});

const all = [visibleExpense, hiddenExpense, incomeCategory, hiddenIncome];

describe('createBudgetAnalysisSpreadsheet', () => {
  describe('hidden category filtering', () => {
    it('excludes hidden categories when showHiddenCategories is false', () => {
      const result = filterBaseCategories(all, false);
      expect(result).toContain(visibleExpense);
      expect(result).not.toContain(hiddenExpense);
    });

    it('includes hidden expense categories when showHiddenCategories is true', () => {
      const result = filterBaseCategories(all, true);
      expect(result).toContain(visibleExpense);
      expect(result).toContain(hiddenExpense);
    });

    it('always excludes income categories regardless of showHiddenCategories', () => {
      const resultFalse = filterBaseCategories(all, false);
      const resultTrue = filterBaseCategories(all, true);
      expect(resultFalse).not.toContain(incomeCategory);
      expect(resultFalse).not.toContain(hiddenIncome);
      expect(resultTrue).not.toContain(incomeCategory);
      expect(resultTrue).not.toContain(hiddenIncome);
    });

    it('returns only visible expense categories by default', () => {
      const result = filterBaseCategories(all, false);
      expect(result).toHaveLength(1);
      expect(result[0]).toBe(visibleExpense);
    });

    it('returns all expense categories when flag is true', () => {
      const result = filterBaseCategories(all, true);
      expect(result).toHaveLength(2);
      expect(result).toContain(visibleExpense);
      expect(result).toContain(hiddenExpense);
    });
  });
});
