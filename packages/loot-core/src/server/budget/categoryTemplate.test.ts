import { amountToInteger } from '../../shared/util';
import { type CategoryEntity } from '../../types/models';

import { CategoryTemplate } from './categoryTemplate';
import { type Template } from './types/templates';

// Test helper class to access constructor and methods
class TestCategoryTemplate extends CategoryTemplate {
  constructor(
    templates: Template[],
    category: CategoryEntity,
    month: string,
    fromLastMonth: number,
    budgeted: number,
  ) {
    super(templates, category, month, fromLastMonth, budgeted);
  }
}

describe('CategoryTemplate', () => {
  describe('runSimple', () => {
    it('should return monthly amount when provided', () => {
      const template: Template = {
        type: 'simple',
        monthly: 100,
        directive: 'budget',
        priority: 1,
      };
      const limit = 0;

      const result = CategoryTemplate.runSimple(template, limit);
      expect(result).toBe(amountToInteger(100));
    });

    it('should return limit when monthly is not provided', () => {
      const template: Template = {
        type: 'simple',
        limit: { amount: 500, hold: false },
        directive: 'budget',
        priority: 1,
      };
      const limit = 500;

      const result = CategoryTemplate.runSimple(template, limit);
      expect(result).toBe(limit);
    });

    it('should handle decimal monthly amounts', () => {
      const template: Template = {
        type: 'simple',
        monthly: 100.5,
        directive: 'budget',
        priority: 1,
      };
      const limit = 0;

      const result = CategoryTemplate.runSimple(template, limit);
      expect(result).toBe(amountToInteger(100.5));
    });
  });

  describe('runWeek', () => {
    let instance: TestCategoryTemplate;

    beforeEach(() => {
      const category: CategoryEntity = {
        id: 'test',
        name: 'Test Category',
        group: 'test-group',
        is_income: false,
      };
      instance = new TestCategoryTemplate([], category, '2024-01', 0, 0);
    });

    it('should calculate weekly amount for single week', () => {
      const template: Template = {
        type: 'week',
        amount: 100,
        weeks: 1,
        starting: '2024-01-01',
        directive: 'budget',
        priority: 1,
      };

      const result = CategoryTemplate.runWeek(template, instance);
      expect(result).toBe(amountToInteger(100));
    });

    it('should calculate weekly amount for multiple weeks', () => {
      const template: Template = {
        type: 'week',
        amount: 100,
        weeks: 2,
        starting: '2024-01-01',
        directive: 'budget',
        priority: 1,
      };

      const result = CategoryTemplate.runWeek(template, instance);
      expect(result).toBe(amountToInteger(100));
    });

    it('should handle weeks spanning multiple months', () => {
      const template: Template = {
        type: 'week',
        amount: 100,
        weeks: 1,
        starting: '2023-12-25',
        directive: 'budget',
        priority: 1,
      };

      const result = CategoryTemplate.runWeek(template, instance);
      expect(result).toBe(amountToInteger(100));
    });

    it('should handle decimal amounts', () => {
      const template: Template = {
        type: 'week',
        amount: 100.5,
        weeks: 1,
        starting: '2024-01-01',
        directive: 'budget',
        priority: 1,
      };

      const result = CategoryTemplate.runWeek(template, instance);
      expect(result).toBe(amountToInteger(100.5));
    });
  });
});
