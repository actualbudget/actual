import { vi } from 'vitest';

import * as aql from '#server/aql';
import * as db from '#server/db';
import type { DbCategory } from '#server/db';
import { amountToInteger } from '#shared/util';
import type { CategoryEntity } from '#types/models';
import type { Template } from '#types/models/templates';

import * as actions from './actions';
import { CategoryTemplateContext } from './category-template-context';
import { distributeRemainder } from './goal-template';
import * as statements from './statements';

// Mock getSheetValue and getCategories
vi.mock('./actions', () => ({
  getSheetValue: vi.fn(),
  getSheetBoolean: vi.fn(),
  isTrackingBudget: vi.fn(),
}));

vi.mock('#server/db', () => ({
  getCategories: vi.fn(),
}));

vi.mock('#server/aql', () => ({
  aqlQuery: vi.fn(),
}));

vi.mock('./statements', () => ({
  getActiveSchedules: vi.fn(),
}));

// Helper function to mock preferences (hideFraction and defaultCurrencyCode)
function mockPreferences(
  hideFraction: boolean = false,
  currencyCode: string = 'USD',
) {
  vi.mocked(aql.aqlQuery).mockImplementation(async (query: unknown) => {
    const queryStr = JSON.stringify(query);
    if (queryStr.includes('hideFraction')) {
      return {
        data: [{ value: hideFraction ? 'true' : 'false' }],
        dependencies: [],
      };
    }
    if (queryStr.includes('defaultCurrencyCode')) {
      return {
        data: currencyCode ? [{ value: currencyCode }] : [],
        dependencies: [],
      };
    }
    return { data: [], dependencies: [] };
  });
}

// Test helper class to access constructor and methods
class TestCategoryTemplateContext extends CategoryTemplateContext {
  public constructor(
    templates: Template[],
    category: CategoryEntity,
    month: string,
    fromLastMonth: number,
    budgeted: number,
    currencyCode: string = 'USD',
    hideDecimal: boolean = false,
  ) {
    super(
      templates,
      category,
      month,
      fromLastMonth,
      budgeted,
      currencyCode,
      hideDecimal,
    );
  }
}

describe('CategoryTemplateContext', () => {
  describe('runSimple', () => {
    it('should return monthly amount when provided', () => {
      const category: CategoryEntity = {
        id: 'test',
        name: 'Test Category',
        group: 'test-group',
        is_income: false,
      };
      const template: Template = {
        type: 'simple',
        monthly: 100,
        directive: 'template',
        priority: 1,
      };

      const instance = new TestCategoryTemplateContext(
        [],
        category,
        '2024-01',
        0,
        0,
      );

      const result = CategoryTemplateContext.runSimple(template, instance);
      expect(result).toBe(amountToInteger(100));
    });

    it('should return limit when monthly is not provided', () => {
      const category: CategoryEntity = {
        id: 'test',
        name: 'Test Category',
        group: 'test-group',
        is_income: false,
      };
      const template: Template = {
        type: 'simple',
        limit: { amount: 500, hold: false, period: 'monthly' },
        directive: 'template',
        priority: 1,
      };

      const instance = new TestCategoryTemplateContext(
        [template],
        category,
        '2024-01',
        0,
        0,
      );

      const result = CategoryTemplateContext.runSimple(template, instance);
      expect(result).toBe(amountToInteger(500));
    });

    it('should handle weekly limit', async () => {
      const category: CategoryEntity = {
        id: 'test',
        name: 'Test Category',
        group: 'test-group',
        is_income: false,
      };
      const template: Template = {
        type: 'simple',
        limit: {
          amount: 100,
          hold: false,
          period: 'weekly',
          start: '2024-01-01',
        },
        directive: 'template',
        priority: 1,
      };
      const instance = new TestCategoryTemplateContext(
        [template],
        category,
        '2024-01',
        0,
        0,
      );
      const result = await instance.runTemplatesForPriority(1, 100000, 100000);
      expect(result).toBe(50000); // 5 Mondays * 100
    });

    it('should handle daily limit', async () => {
      const category: CategoryEntity = {
        id: 'test',
        name: 'Test Category',
        group: 'test-group',
        is_income: false,
      };
      const template: Template = {
        type: 'simple',
        limit: { amount: 10, hold: false, period: 'daily' },
        directive: 'template',
        priority: 1,
      };
      const instance = new TestCategoryTemplateContext(
        [template],
        category,
        '2024-01',
        0,
        0,
      );
      const result = await instance.runTemplatesForPriority(1, 100000, 100000);
      expect(result).toBe(31000); // 31 days * 10
    });
  });

  describe('runRefill', () => {
    it('should refill up to the monthly limit', async () => {
      const category: CategoryEntity = {
        id: 'test',
        name: 'Test Category',
        group: 'test-group',
        is_income: false,
      };
      const limitTemplate: Template = {
        type: 'limit',
        amount: 150,
        hold: false,
        period: 'monthly',
        directive: 'template',
        priority: null,
      };
      const refillTemplate: Template = {
        type: 'refill',
        directive: 'template',
        priority: 1,
      };

      const instance = new TestCategoryTemplateContext(
        [limitTemplate, refillTemplate],
        category,
        '2024-01',
        9000,
        0,
      );

      const result = await instance.runTemplatesForPriority(1, 10000, 10000);
      expect(result).toBe(6000); // 150 - 90
    });

    it('should handle weekly limit refill', async () => {
      const category: CategoryEntity = {
        id: 'test',
        name: 'Test Category',
        group: 'test-group',
        is_income: false,
      };
      const limitTemplate: Template = {
        type: 'limit',
        amount: 100,
        hold: false,
        period: 'weekly',
        start: '2024-01-01',
        directive: 'template',
        priority: null,
      };
      const refillTemplate: Template = {
        type: 'refill',
        directive: 'template',
        priority: 1,
      };

      const instance = new TestCategoryTemplateContext(
        [limitTemplate, refillTemplate],
        category,
        '2024-01',
        0,
        0,
      );
      const result = await instance.runTemplatesForPriority(1, 100000, 100000);
      expect(result).toBe(50000); // 5 Mondays * 100
    });

    it('should handle daily limit refill', async () => {
      const category: CategoryEntity = {
        id: 'test',
        name: 'Test Category',
        group: 'test-group',
        is_income: false,
      };
      const limitTemplate: Template = {
        type: 'limit',
        amount: 10,
        hold: false,
        period: 'daily',
        directive: 'template',
        priority: null,
      };
      const refillTemplate: Template = {
        type: 'refill',
        directive: 'template',
        priority: 1,
      };
      const instance = new TestCategoryTemplateContext(
        [limitTemplate, refillTemplate],
        category,
        '2024-01',
        0,
        0,
      );
      const result = await instance.runTemplatesForPriority(1, 100000, 100000);
      expect(result).toBe(31000); // 31 days * 10
    });
  });

  describe('runCopy', () => {
    let instance: TestCategoryTemplateContext;

    beforeEach(() => {
      const category: CategoryEntity = {
        id: 'test',
        name: 'Test Category',
        group: 'test-group',
        is_income: false,
      };
      instance = new TestCategoryTemplateContext([], category, '2024-01', 0, 0);
      vi.clearAllMocks();
    });

    it('should copy budget from previous month', async () => {
      const template: Template = {
        type: 'copy',
        lookBack: 1,
        directive: 'template',
        priority: 1,
      };

      vi.mocked(actions.getSheetValue).mockResolvedValue(100);

      const result = await CategoryTemplateContext.runCopy(template, instance);
      expect(result).toBe(100);
    });

    it('should copy budget from multiple months back', async () => {
      const template: Template = {
        type: 'copy',
        lookBack: 3,
        directive: 'template',
        priority: 1,
      };

      vi.mocked(actions.getSheetValue).mockResolvedValue(200);

      const result = await CategoryTemplateContext.runCopy(template, instance);
      expect(result).toBe(200);
    });

    it('should handle zero budget amount', async () => {
      const template: Template = {
        type: 'copy',
        lookBack: 1,
        directive: 'template',
        priority: 1,
      };

      vi.mocked(actions.getSheetValue).mockResolvedValue(0);

      const result = await CategoryTemplateContext.runCopy(template, instance);
      expect(result).toBe(0);
    });
  });

  describe('runPeriodic', () => {
    let instance: TestCategoryTemplateContext;

    beforeEach(() => {
      const category: CategoryEntity = {
        id: 'test',
        name: 'Test Category',
        group: 'test-group',
        is_income: false,
      };
      instance = new TestCategoryTemplateContext([], category, '2024-01', 0, 0);
    });

    //5 mondays in January 2024
    it('should calculate weekly amount for single week', () => {
      const template: Template = {
        type: 'periodic',
        amount: 100,
        period: {
          period: 'week',
          amount: 1,
        },
        starting: '2024-01-01',
        directive: 'template',
        priority: 1,
      };

      const result = CategoryTemplateContext.runPeriodic(template, instance);
      expect(result).toBe(amountToInteger(500));
    });

    it('should calculate weekly amount for multiple weeks', () => {
      const template: Template = {
        type: 'periodic',
        amount: 100,
        period: {
          period: 'week',
          amount: 2,
        },
        starting: '2024-01-01',
        directive: 'template',
        priority: 1,
      };

      const result = CategoryTemplateContext.runPeriodic(template, instance);
      expect(result).toBe(amountToInteger(300));
    });

    it('should handle weeks spanning multiple months', () => {
      const template: Template = {
        type: 'periodic',
        amount: 100,
        period: {
          period: 'week',
          amount: 7,
        },
        starting: '2023-12-04',
        directive: 'template',
        priority: 1,
      };

      const result = CategoryTemplateContext.runPeriodic(template, instance);
      expect(result).toBe(amountToInteger(100));
    });

    it('should handle periodic days', () => {
      const template: Template = {
        type: 'periodic',
        amount: 100,
        period: {
          period: 'day',
          amount: 10,
        },
        starting: '2024-01-01',
        directive: 'template',
        priority: 1,
      };

      const result = CategoryTemplateContext.runPeriodic(template, instance);
      expect(result).toBe(amountToInteger(400)); // for the 1st, 11th, 21st, 31st
    });

    it('should handle periodic years', () => {
      const template: Template = {
        type: 'periodic',
        amount: 100,
        period: {
          period: 'year',
          amount: 1,
        },
        starting: '2023-01-01',
        directive: 'template',
        priority: 1,
      };

      const result = CategoryTemplateContext.runPeriodic(template, instance);
      expect(result).toBe(amountToInteger(100));
    });

    it('should handle periodic months', () => {
      const template: Template = {
        type: 'periodic',
        amount: 100,
        period: {
          period: 'month',
          amount: 2,
        },
        starting: '2023-11-01',
        directive: 'template',
        priority: 1,
      };

      const result = CategoryTemplateContext.runPeriodic(template, instance);
      expect(result).toBe(amountToInteger(100));
    });
  });

  describe('runSpend', () => {
    let instance: TestCategoryTemplateContext;

    beforeEach(() => {
      const category: CategoryEntity = {
        id: 'test',
        name: 'Test Category',
        group: 'test-group',
        is_income: false,
      };
      instance = new TestCategoryTemplateContext([], category, '2024-01', 0, 0);
      vi.clearAllMocks();
    });

    it('should calculate monthly amount needed to reach target', async () => {
      const template: Template = {
        type: 'spend',
        amount: 1000,
        from: '2023-11',
        month: '2024-01',
        directive: 'template',
        priority: 1,
      };

      vi.mocked(actions.getSheetValue)
        .mockResolvedValueOnce(-10000) // spent in Nov
        .mockResolvedValueOnce(20000) // leftover in Nov
        .mockResolvedValueOnce(10000); // budgeted in Dec

      const result = await CategoryTemplateContext.runSpend(template, instance);
      expect(result).toBe(60000);
    });

    it('should handle repeating spend template', async () => {
      const template: Template = {
        type: 'spend',
        amount: 1000,
        from: '2023-11',
        month: '2023-12',
        repeat: 3,
        directive: 'template',
        priority: 1,
      };

      vi.mocked(actions.getSheetValue)
        .mockResolvedValueOnce(-10000)
        .mockResolvedValueOnce(20000)
        .mockResolvedValueOnce(10000);

      const result = await CategoryTemplateContext.runSpend(template, instance);
      expect(result).toBe(33333);
    });

    it('should return zero for past target date', async () => {
      const template: Template = {
        type: 'spend',
        amount: 1000,
        from: '2023-12',
        month: '2023-12',
        directive: 'template',
        priority: 1,
      };

      const result = await CategoryTemplateContext.runSpend(template, instance);
      expect(result).toBe(0);
    });
  });

  describe('runPercentage', () => {
    let instance: TestCategoryTemplateContext;

    beforeEach(() => {
      const category: CategoryEntity = {
        id: 'test',
        name: 'Test Category',
        group: 'test-group',
        is_income: false,
      };
      instance = new TestCategoryTemplateContext([], category, '2024-01', 0, 0);
      vi.clearAllMocks();
    });

    it('should calculate percentage of all income', async () => {
      const template: Template = {
        type: 'percentage',
        percent: 10,
        category: 'all income',
        previous: false,
        directive: 'template',
        priority: 1,
      };

      vi.mocked(actions.getSheetValue).mockResolvedValue(10000);

      const result = await CategoryTemplateContext.runPercentage(
        template,
        0,
        instance,
      );
      expect(result).toBe(1000); // 10% of 10000
    });

    it('should calculate percentage of available funds', async () => {
      const template: Template = {
        type: 'percentage',
        percent: 20,
        category: 'available funds',
        previous: false,
        directive: 'template',
        priority: 1,
      };

      const result = await CategoryTemplateContext.runPercentage(
        template,
        500,
        instance,
      );
      expect(result).toBe(100); // 20% of 500
    });

    it('should calculate percentage of specific income category', async () => {
      const template: Template = {
        type: 'percentage',
        percent: 15,
        category: 'Salary',
        previous: false,
        directive: 'template',
        priority: 1,
      };

      vi.mocked(db.getCategories).mockResolvedValue([
        {
          id: 'income1',
          name: 'Salary',
          is_income: 1,
          cat_group: 'income',
          sort_order: 1,
          hidden: 0,
          tombstone: 0,
        },
      ]);
      vi.mocked(actions.getSheetValue).mockResolvedValue(2000);

      const result = await CategoryTemplateContext.runPercentage(
        template,
        0,
        instance,
      );
      expect(result).toBe(300); // 15% of 2000
    });

    it('should calculate percentage of previous month income', async () => {
      const template: Template = {
        type: 'percentage',
        percent: 10,
        category: 'all income',
        previous: true,
        directive: 'template',
        priority: 1,
      };

      vi.mocked(actions.getSheetValue).mockResolvedValue(10000);

      const result = await CategoryTemplateContext.runPercentage(
        template,
        0,
        instance,
      );
      expect(result).toBe(1000); // 10% of 10000
      expect(actions.getSheetValue).toHaveBeenCalledWith(
        'budget202312',
        'total-income',
      );
    });
  });

  describe('runAverage', () => {
    let instance: TestCategoryTemplateContext;

    beforeEach(() => {
      const category: CategoryEntity = {
        id: 'test',
        name: 'Test Category',
        group: 'test-group',
        is_income: false,
      };
      instance = new TestCategoryTemplateContext([], category, '2024-01', 0, 0);
      vi.clearAllMocks();
    });

    it('should calculate average of 3 months', async () => {
      const template: Template = {
        type: 'average',
        numMonths: 3,
        directive: 'template',
        priority: 1,
      };

      vi.mocked(actions.getSheetValue)
        .mockResolvedValueOnce(-100) // Dec 2023
        .mockResolvedValueOnce(-200) // Nov 2023
        .mockResolvedValueOnce(-300); // Oct 2023

      const result = await CategoryTemplateContext.runAverage(
        template,
        instance,
      );
      expect(result).toBe(200); // Average of -100, -200, -300
    });

    it('should handle zero amounts', async () => {
      const template: Template = {
        type: 'average',
        numMonths: 3,
        directive: 'template',
        priority: 1,
      };

      vi.mocked(actions.getSheetValue)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(-300);

      const result = await CategoryTemplateContext.runAverage(
        template,
        instance,
      );
      expect(result).toBe(100);
    });

    it('should handle mixed positive and negative amounts', async () => {
      const template: Template = {
        type: 'average',
        numMonths: 3,
        directive: 'template',
        priority: 1,
      };

      vi.mocked(actions.getSheetValue)
        .mockResolvedValueOnce(-100)
        .mockResolvedValueOnce(200)
        .mockResolvedValueOnce(-300);

      const result = await CategoryTemplateContext.runAverage(
        template,
        instance,
      );
      expect(result).toBe(67); // Average of -100, 200, -300
    });

    it('should handle positive percent adjustments', async () => {
      const template: Template = {
        type: 'average',
        numMonths: 3,
        directive: 'template',
        priority: 1,
        adjustment: 10,
        adjustmentType: 'percent',
      };

      vi.mocked(actions.getSheetValue)
        .mockResolvedValueOnce(-100)
        .mockResolvedValueOnce(-100)
        .mockResolvedValueOnce(-100);

      const result = await CategoryTemplateContext.runAverage(
        template,
        instance,
      );
      expect(result).toBe(110);
    });

    it('should handle negative percent adjustments', async () => {
      const template: Template = {
        type: 'average',
        numMonths: 3,
        directive: 'template',
        priority: 1,
        adjustment: -10,
        adjustmentType: 'percent',
      };

      vi.mocked(actions.getSheetValue)
        .mockResolvedValueOnce(-100)
        .mockResolvedValueOnce(-100)
        .mockResolvedValueOnce(-100);

      const result = await CategoryTemplateContext.runAverage(
        template,
        instance,
      );
      expect(result).toBe(90);
    });
    it('should handle zero percent adjustments', async () => {
      const template: Template = {
        type: 'average',
        numMonths: 3,
        directive: 'template',
        priority: 1,
        adjustment: 0,
        adjustmentType: 'percent',
      };

      vi.mocked(actions.getSheetValue)
        .mockResolvedValueOnce(-100)
        .mockResolvedValueOnce(-100)
        .mockResolvedValueOnce(-100);

      const result = await CategoryTemplateContext.runAverage(
        template,
        instance,
      );
      expect(result).toBe(100);
    });

    it('should handle zero amount adjustments', async () => {
      const template: Template = {
        type: 'average',
        numMonths: 3,
        directive: 'template',
        priority: 1,
        adjustment: 0,
        adjustmentType: 'fixed',
      };

      vi.mocked(actions.getSheetValue)
        .mockResolvedValueOnce(-100)
        .mockResolvedValueOnce(-100)
        .mockResolvedValueOnce(-100);

      const result = await CategoryTemplateContext.runAverage(
        template,
        instance,
      );
      expect(result).toBe(100);
    });

    it('should handle positive amount adjustments', async () => {
      const template: Template = {
        type: 'average',
        numMonths: 3,
        directive: 'template',
        priority: 1,
        adjustment: 11,
        adjustmentType: 'fixed',
      };

      vi.mocked(actions.getSheetValue)
        .mockResolvedValueOnce(-10000)
        .mockResolvedValueOnce(-10000)
        .mockResolvedValueOnce(-10000);

      const result = await CategoryTemplateContext.runAverage(
        template,
        instance,
      );
      expect(result).toBe(11100);
    });

    it('should handle negative amount adjustments', async () => {
      const template: Template = {
        type: 'average',
        numMonths: 3,
        directive: 'template',
        priority: 1,
        adjustment: -1,
        adjustmentType: 'fixed',
      };

      vi.mocked(actions.getSheetValue)
        .mockResolvedValueOnce(-10000)
        .mockResolvedValueOnce(-10000)
        .mockResolvedValueOnce(-10000);

      const result = await CategoryTemplateContext.runAverage(
        template,
        instance,
      );
      expect(result).toBe(9900);
    });
  });

  describe('runBy', () => {
    let instance: TestCategoryTemplateContext;

    beforeEach(() => {
      const category: CategoryEntity = {
        id: 'test',
        name: 'Test Category',
        group: 'test-group',
        is_income: false,
      };
      instance = new TestCategoryTemplateContext(
        [
          {
            type: 'by',
            amount: 1000,
            month: '2024-03',
            directive: 'template',
            priority: 1,
          },
          {
            type: 'by',
            amount: 2000,
            month: '2024-06',
            directive: 'template',
            priority: 1,
          },
        ],
        category,
        '2024-01',
        0,
        0,
      );
    });

    it('should calculate monthly amount needed for multiple targets', () => {
      const result = CategoryTemplateContext.runBy(instance);
      expect(result).toBe(66667);
    });

    it('should handle repeating targets', () => {
      instance = new TestCategoryTemplateContext(
        [
          {
            type: 'by',
            amount: 1000,
            month: '2023-03',
            repeat: 12,
            directive: 'template',
            priority: 1,
          },
          {
            type: 'by',
            amount: 2000,
            month: '2023-06',
            repeat: 12,
            directive: 'template',
            priority: 1,
          },
        ],
        instance.category,
        '2024-01',
        0,
        0,
      );

      const result = CategoryTemplateContext.runBy(instance);
      expect(result).toBe(83333);
    });

    it('should handle existing balance', () => {
      instance = new TestCategoryTemplateContext(
        [
          {
            type: 'by',
            amount: 1000,
            month: '2024-03',
            directive: 'template',
            priority: 1,
          },
          {
            type: 'by',
            amount: 2000,
            month: '2024-06',
            directive: 'template',
            priority: 1,
          },
        ],
        instance.category,
        '2024-01',
        500,
        0,
      );

      const result = CategoryTemplateContext.runBy(instance);
      expect(result).toBe(66500); // (1000 + 2000 - 5) / 3
    });
  });

  describe('template priorities', () => {
    it('should handle multiple templates with priorities and insufficient funds', async () => {
      const category: CategoryEntity = {
        id: 'test',
        name: 'Test Category',
        group: 'test-group',
        is_income: false,
      };
      const templates: Template[] = [
        {
          type: 'simple',
          monthly: 100,
          directive: 'template',
          priority: 1,
        },
        {
          type: 'simple',
          monthly: 200,
          directive: 'template',
          priority: 1,
        },
      ];
      const instance = new TestCategoryTemplateContext(
        templates,
        category,
        '2024-01',
        0,
        0,
      );
      const result = await instance.runTemplatesForPriority(1, 150, 150);
      expect(result).toBe(150); // Max out at available funds
    });
  });

  describe('category limits', () => {
    it('should not budget over monthly limit', async () => {
      const category: CategoryEntity = {
        id: 'test',
        name: 'Test Category',
        group: 'test-group',
        is_income: false,
      };
      const templates: Template[] = [
        {
          type: 'simple',
          monthly: 100,
          limit: { amount: 150, hold: false, period: 'monthly' },
          directive: 'template',
          priority: 1,
        },
      ];
      const instance = new TestCategoryTemplateContext(
        templates,
        category,
        '2024-01',
        9000,
        0,
      );
      const result = await instance.runTemplatesForPriority(1, 10000, 10000);
      expect(result).toBe(6000); //150 - 90
    });

    it('should handle hold flag when limit is reached', async () => {
      const category: CategoryEntity = {
        id: 'test',
        name: 'Test Category',
        group: 'test-group',
        is_income: false,
      };
      const templates: Template[] = [
        {
          type: 'simple',
          monthly: 100,
          limit: { amount: 200, hold: true, period: 'monthly' },
          directive: 'template',
          priority: 1,
        },
      ];
      const instance = new TestCategoryTemplateContext(
        templates,
        category,
        '2024-01',
        300,
        0,
      );
      const result = instance.getLimitExcess();
      expect(result).toBe(0);
    });

    it('should remove funds if over limit', async () => {
      const category: CategoryEntity = {
        id: 'test',
        name: 'Test Category',
        group: 'test-group',
        is_income: false,
      };
      const templates: Template[] = [
        {
          type: 'simple',
          monthly: 100,
          limit: { amount: 200, hold: false, period: 'monthly' },
          directive: 'template',
          priority: 1,
        },
      ];
      const instance = new TestCategoryTemplateContext(
        templates,
        category,
        '2024-01',
        30000,
        0,
      );
      const result = instance.getLimitExcess();
      expect(result).toBe(10000);
    });
  });

  describe('remainder templates', () => {
    it('should distribute available funds based on weight', async () => {
      const category: CategoryEntity = {
        id: 'test',
        name: 'Test Category',
        group: 'test-group',
        is_income: false,
      };
      const templates: Template[] = [
        {
          type: 'remainder',
          weight: 2,
          directive: 'template',
          priority: null,
        },
      ];
      const instance = new TestCategoryTemplateContext(
        templates,
        category,
        '2024-01',
        0,
        0,
      );
      const result = instance.runRemainder(100, 50);
      expect(result).toBe(100); // 2 * 50 = 100
    });

    it('remainder should handle last cent', async () => {
      const category: CategoryEntity = {
        id: 'test',
        name: 'Test Category',
        group: 'test-group',
        is_income: false,
      };
      const templates: Template[] = [
        {
          type: 'remainder',
          weight: 1,
          directive: 'template',
          priority: null,
        },
      ];
      const instance = new TestCategoryTemplateContext(
        templates,
        category,
        '2024-01',
        0,
        0,
      );
      const result = instance.runRemainder(101, 100);
      expect(result).toBe(101);
    });

    it('remainder loop terminates when per-context share rounds to zero', async () => {
      const category: CategoryEntity = {
        id: 'test',
        name: 'Test Category',
        group: 'test-group',
        is_income: false,
      };
      const makeInstance = () =>
        new TestCategoryTemplateContext(
          [
            {
              type: 'remainder',
              weight: 1,
              directive: 'template',
              priority: null,
            },
          ],
          category,
          '2024-01',
          0,
          0,
        );

      const contexts = [
        makeInstance(),
        makeInstance(),
        makeInstance(),
        makeInstance(),
        makeInstance(),
      ];

      const remaining = distributeRemainder(contexts, 2);
      expect(remaining).toBe(2);
    });

    it('remainder wont over budget', async () => {
      const category: CategoryEntity = {
        id: 'test',
        name: 'Test Category',
        group: 'test-group',
        is_income: false,
      };
      const templates: Template[] = [
        {
          type: 'remainder',
          weight: 1,
          directive: 'template',
          priority: null,
        },
      ];
      const instance = new TestCategoryTemplateContext(
        templates,
        category,
        '2024-01',
        0,
        0,
      );
      const result = instance.runRemainder(99, 100);
      expect(result).toBe(99);
    });
  });

  describe('full process', () => {
    it('should handle priority limits through the entire process', async () => {
      const category: CategoryEntity = {
        id: 'test',
        name: 'Test Category',
        group: 'test-group',
        is_income: false,
      };
      const templates: Template[] = [
        {
          type: 'simple',
          monthly: 100,
          directive: 'template',
          priority: 1,
        },
        {
          type: 'simple',
          monthly: 200,
          directive: 'template',
          priority: 2,
        },
        {
          type: 'remainder',
          weight: 1,
          directive: 'template',
          priority: null,
        },
      ];

      // Mock the sheet values needed for init
      vi.mocked(actions.getSheetValue).mockResolvedValueOnce(0); // lastMonthBalance
      vi.mocked(actions.getSheetBoolean).mockResolvedValueOnce(false); // carryover
      vi.mocked(actions.isTrackingBudget).mockReturnValueOnce(false);
      mockPreferences(false, 'USD');

      // Initialize the template
      const instance = await CategoryTemplateContext.init(
        templates,
        category,
        '2024-01',
        0,
      );

      // Run each priority level separately
      const priority1Result = await instance.runTemplatesForPriority(
        1,
        15000,
        15000,
      );
      const priority2Result = await instance.runTemplatesForPriority(
        2,
        15000 - priority1Result,
        15000,
      );

      // Get the final values
      const values = instance.getValues();

      // Verify the results
      expect(priority1Result).toBe(10000); // Should get full amount for priority 1
      expect(priority2Result).toBe(5000); // Should get remaining funds for priority 2
      expect(values.budgeted).toBe(15000); // Should match the total of both priorities
      expect(values.goal).toBe(30000); // Should be the sum of all template amounts
      expect(values.longGoal).toBe(null); // No goal template
    });

    it('should handle category limits through the entire process', async () => {
      const category: CategoryEntity = {
        id: 'test',
        name: 'Test Category',
        group: 'test-group',
        is_income: false,
      };
      const templates: Template[] = [
        {
          type: 'simple',
          monthly: 100,
          directive: 'template',
          priority: 1,
        },
        {
          type: 'simple',
          monthly: 200,
          directive: 'template',
          priority: 1,
        },
        {
          type: 'simple',
          limit: { amount: 150, hold: false, period: 'monthly' },
          directive: 'template',
          priority: 1,
        },
      ];

      // Mock the sheet values needed for init
      vi.mocked(actions.getSheetValue).mockResolvedValueOnce(0); // lastMonthBalance
      vi.mocked(actions.getSheetBoolean).mockResolvedValueOnce(false); // carryover
      vi.mocked(actions.isTrackingBudget).mockReturnValueOnce(false);
      mockPreferences(false, 'USD');

      // Initialize the template
      const instance = await CategoryTemplateContext.init(
        templates,
        category,
        '2024-01',
        0,
      );

      // Run the templates with more than enough funds
      const result = await instance.runTemplatesForPriority(1, 100000, 100000);

      // Get the final values
      const values = instance.getValues();

      // Verify the results
      expect(result).toBe(15000); // Should be limited by the category limit
      expect(values.budgeted).toBe(15000); // Should match the limit
      expect(values.goal).toBe(15000); // Should be the limit amount
      expect(values.longGoal).toBe(null); // No goal template
    });

    it('should handle remainder template at the end of the process', async () => {
      const category: CategoryEntity = {
        id: 'test',
        name: 'Test Category',
        group: 'test-group',
        is_income: false,
      };
      const templates: Template[] = [
        {
          type: 'simple',
          monthly: 100,
          directive: 'template',
          priority: 1,
        },
        {
          type: 'simple',
          monthly: 200,
          directive: 'template',
          priority: 1,
        },
        {
          type: 'remainder',
          weight: 1,
          directive: 'template',
          priority: null,
        },
      ];

      // Mock the sheet values needed for init
      vi.mocked(actions.getSheetValue).mockResolvedValueOnce(0); // lastMonthBalance
      vi.mocked(actions.getSheetBoolean).mockResolvedValueOnce(false); // carryover
      vi.mocked(actions.isTrackingBudget).mockReturnValueOnce(false);
      mockPreferences(false, 'USD');

      // Initialize the template
      const instance = await CategoryTemplateContext.init(
        templates,
        category,
        '2024-01',
        0,
      );
      const weight = instance.getRemainderWeight();

      // Run the templates with more than enough funds
      const result = await instance.runTemplatesForPriority(1, 100000, 100000);

      // Run the remainder template
      const perWeight = (100000 - result) / weight;
      const remainderResult = instance.runRemainder(perWeight, perWeight);

      // Get the final values
      const values = instance.getValues();

      // Verify the results
      expect(result).toBe(30000); // Should get full amount for both simple templates
      expect(remainderResult).toBe(70000); // Should get remaining funds
      expect(values.budgeted).toBe(100000); // Should match the total of all templates
      expect(values.goal).toBe(30000); // Should be the sum of the simple templates
      expect(values.longGoal).toBe(null); // No goal template
    });

    it('should handle goal template through the entire process', async () => {
      const category: CategoryEntity = {
        id: 'test',
        name: 'Test Category',
        group: 'test-group',
        is_income: false,
      };
      const templates: Template[] = [
        {
          type: 'simple',
          monthly: 100,
          directive: 'template',
          priority: 1,
        },
        {
          type: 'simple',
          monthly: 200,
          directive: 'template',
          priority: 1,
        },
        {
          type: 'goal',
          amount: 1000,
          directive: 'goal',
        },
      ];

      // Mock the sheet values needed for init
      vi.mocked(actions.getSheetValue).mockResolvedValueOnce(0); // lastMonthBalance
      vi.mocked(actions.getSheetBoolean).mockResolvedValueOnce(false); // carryover
      vi.mocked(actions.isTrackingBudget).mockReturnValueOnce(false);
      mockPreferences(false, 'USD');

      // Initialize the template
      const instance = await CategoryTemplateContext.init(
        templates,
        category,
        '2024-01',
        0,
      );

      // Run the templates with more than enough funds
      const result = await instance.runTemplatesForPriority(1, 100000, 100000);

      // Get the final values
      const values = instance.getValues();

      // Verify the results
      expect(result).toBe(30000); // Should get full amount for both simple templates
      expect(values.budgeted).toBe(30000); // Should match the result
      expect(values.goal).toBe(100000); // Should be the goal amount
      expect(values.longGoal).toBe(true); // Should have a long goal
      expect(instance.isGoalOnly()).toBe(false); // Should not be goal only
    });

    it('should handle goal-only template through the entire process', async () => {
      const category: CategoryEntity = {
        id: 'test',
        name: 'Test Category',
        group: 'test-group',
        is_income: false,
      };
      const templates: Template[] = [
        {
          type: 'goal',
          amount: 1000,
          directive: 'goal',
        },
      ];

      // Mock the sheet values needed for init
      vi.mocked(actions.getSheetValue).mockResolvedValueOnce(10000); // lastMonthBalance
      vi.mocked(actions.getSheetBoolean).mockResolvedValueOnce(false); // carryover
      vi.mocked(actions.isTrackingBudget).mockReturnValueOnce(false);
      mockPreferences(false, 'USD');

      // Initialize the template
      const instance = await CategoryTemplateContext.init(
        templates,
        category,
        '2024-01',
        10000,
      );

      expect(instance.isGoalOnly()).toBe(true); // Should be goal only
      // Get the final values
      const values = instance.getValues();

      // Verify the results
      expect(values.budgeted).toBe(10000);
      expect(values.goal).toBe(100000); // Should be the goal amount
      expect(values.longGoal).toBe(true); // Should have a long goal
    });

    it('should handle hide fraction', async () => {
      const category: CategoryEntity = {
        id: 'test',
        name: 'Test Category',
        group: 'test-group',
        is_income: false,
      };
      const templates: Template[] = [
        {
          type: 'simple',
          monthly: 100.89,
          directive: 'template',
          priority: 1,
        },
        {
          type: 'goal',
          amount: 1000,
          directive: 'goal',
        },
      ];

      // Mock the sheet values needed for init
      vi.mocked(actions.getSheetValue).mockResolvedValueOnce(0); // lastMonthBalance
      vi.mocked(actions.getSheetBoolean).mockResolvedValueOnce(false); // carryover
      vi.mocked(actions.isTrackingBudget).mockReturnValueOnce(false);
      mockPreferences(true, 'USD');

      // Initialize the template
      const instance = await CategoryTemplateContext.init(
        templates,
        category,
        '2024-01',
        0,
      );

      // Run the templates with more than enough funds
      const result = await instance.runTemplatesForPriority(1, 100000, 100000);

      // Get the final values
      const values = instance.getValues();

      // Verify the results
      expect(result).toBe(10100); // Should get full amount rounded up
      expect(values.budgeted).toBe(10100); // Should match the result
      expect(values.goal).toBe(100000); // Should be the goal amount
      expect(values.longGoal).toBe(true); // Should have a long goal
      expect(instance.isGoalOnly()).toBe(false); // Should not be goal only
    });
  });

  describe('JPY currency', () => {
    it('should handle simple template with JPY correctly', async () => {
      const category: CategoryEntity = {
        id: 'test',
        name: 'Test Category',
        group: 'test-group',
        is_income: false,
      };
      const template: Template = {
        type: 'simple',
        monthly: 50,
        directive: 'template',
        priority: 1,
      };

      vi.mocked(actions.getSheetValue).mockResolvedValueOnce(0);
      vi.mocked(actions.getSheetBoolean).mockResolvedValueOnce(false);
      vi.mocked(actions.isTrackingBudget).mockReturnValueOnce(false);
      mockPreferences(true, 'JPY');

      const instance = await CategoryTemplateContext.init(
        [template],
        category,
        '2024-01',
        0,
      );

      await instance.runTemplatesForPriority(1, 100000, 100000);
      const values = instance.getValues();

      expect(values.budgeted).toBe(50);
    });

    it('should handle small amounts with JPY correctly', async () => {
      const category: CategoryEntity = {
        id: 'test',
        name: 'Test Category',
        group: 'test-group',
        is_income: false,
      };
      const template: Template = {
        type: 'simple',
        monthly: 5,
        directive: 'template',
        priority: 1,
      };

      vi.mocked(actions.getSheetValue).mockResolvedValueOnce(0);
      vi.mocked(actions.getSheetBoolean).mockResolvedValueOnce(false);
      vi.mocked(actions.isTrackingBudget).mockReturnValueOnce(false);
      mockPreferences(true, 'JPY');

      const instance = await CategoryTemplateContext.init(
        [template],
        category,
        '2024-01',
        0,
      );

      await instance.runTemplatesForPriority(1, 100000, 100000);
      const values = instance.getValues();

      expect(values.budgeted).toBe(5);
    });

    it('should handle larger amounts with JPY correctly', async () => {
      const category: CategoryEntity = {
        id: 'test',
        name: 'Test Category',
        group: 'test-group',
        is_income: false,
      };
      const template: Template = {
        type: 'simple',
        monthly: 250,
        directive: 'template',
        priority: 1,
      };

      vi.mocked(actions.getSheetValue).mockResolvedValueOnce(0);
      vi.mocked(actions.getSheetBoolean).mockResolvedValueOnce(false);
      mockPreferences(true, 'JPY');

      const instance = await CategoryTemplateContext.init(
        [template],
        category,
        '2024-01',
        0,
      );

      await instance.runTemplatesForPriority(1, 100000, 100000);
      const values = instance.getValues();

      expect(values.budgeted).toBe(250);
    });

    it('should handle weekly limit with JPY correctly', async () => {
      const category: CategoryEntity = {
        id: 'test',
        name: 'Test Category',
        group: 'test-group',
        is_income: false,
      };
      const template: Template = {
        type: 'simple',
        limit: {
          amount: 100,
          hold: false,
          period: 'weekly',
          start: '2024-01-01',
        },
        directive: 'template',
        priority: 1,
      };

      vi.mocked(actions.getSheetValue).mockResolvedValueOnce(0);
      vi.mocked(actions.getSheetBoolean).mockResolvedValueOnce(false);
      mockPreferences(true, 'JPY');

      const instance = await CategoryTemplateContext.init(
        [template],
        category,
        '2024-01',
        0,
      );

      const result = CategoryTemplateContext.runSimple(template, instance);

      expect(result).toBeGreaterThanOrEqual(400);
      expect(result).toBeLessThanOrEqual(500);
    });

    it('should handle periodic template with JPY correctly', async () => {
      const category: CategoryEntity = {
        id: 'test',
        name: 'Test Category',
        group: 'test-group',
        is_income: false,
      };
      const template: Template = {
        type: 'periodic',
        amount: 1000,
        period: { period: 'week', amount: 1 },
        starting: '2024-01-01',
        directive: 'template',
        priority: 1,
      };

      vi.mocked(actions.getSheetValue).mockResolvedValueOnce(0);
      vi.mocked(actions.getSheetBoolean).mockResolvedValueOnce(false);
      mockPreferences(true, 'JPY');

      const instance = await CategoryTemplateContext.init(
        [template],
        category,
        '2024-01',
        0,
      );

      await instance.runTemplatesForPriority(1, 100000, 100000);
      const values = instance.getValues();

      expect(values.budgeted).toBeGreaterThan(3500);
      expect(values.budgeted).toBeLessThan(5500);
    });

    it('should compare JPY vs USD for same template', async () => {
      const category: CategoryEntity = {
        id: 'test',
        name: 'Test Category',
        group: 'test-group',
        is_income: false,
      };
      const template: Template = {
        type: 'simple',
        monthly: 100,
        directive: 'template',
        priority: 1,
      };

      vi.mocked(actions.getSheetValue).mockResolvedValueOnce(0);
      vi.mocked(actions.getSheetBoolean).mockResolvedValueOnce(false);
      mockPreferences(true, 'JPY');

      const instanceJPY = await CategoryTemplateContext.init(
        [template],
        category,
        '2024-01',
        0,
      );
      await instanceJPY.runTemplatesForPriority(1, 100000, 100000);
      const valuesJPY = instanceJPY.getValues();

      vi.mocked(actions.getSheetValue).mockResolvedValueOnce(0);
      vi.mocked(actions.getSheetBoolean).mockResolvedValueOnce(false);
      mockPreferences(false, 'USD');

      const instanceUSD = await CategoryTemplateContext.init(
        [template],
        category,
        '2024-01',
        0,
      );
      await instanceUSD.runTemplatesForPriority(1, 100000, 100000);
      const valuesUSD = instanceUSD.getValues();

      expect(valuesJPY.budgeted).toBe(100);
      expect(valuesUSD.budgeted).toBe(10000);
    });
  });

  describe('validation (init checks)', () => {
    const category: CategoryEntity = {
      id: 'val-cat',
      name: 'Validation Category',
      group: 'g',
      is_income: false,
    };

    beforeEach(() => {
      mockPreferences(false, 'USD');
      vi.mocked(actions.getSheetValue).mockResolvedValue(0);
      vi.mocked(actions.getSheetBoolean).mockResolvedValue(false);
      vi.mocked(actions.isTrackingBudget).mockReturnValue(false);
    });

    it('throws when a schedule template references a non-existent schedule', async () => {
      vi.mocked(statements.getActiveSchedules).mockResolvedValue([
        { name: 'Rent', id: 's1' },
      ] as Awaited<ReturnType<typeof statements.getActiveSchedules>>);
      const templates: Template[] = [
        {
          type: 'schedule',
          name: 'Internet',
          directive: 'template',
          priority: 1,
        },
      ];
      await expect(
        CategoryTemplateContext.init(templates, category, '2024-01', 0),
      ).rejects.toThrow(/Schedule Internet does not exist/);
    });

    it('throws when schedule and by templates have mismatched priorities', async () => {
      vi.mocked(statements.getActiveSchedules).mockResolvedValue([
        { name: 'Rent', id: 's1' },
      ] as Awaited<ReturnType<typeof statements.getActiveSchedules>>);
      const templates: Template[] = [
        {
          type: 'schedule',
          name: 'Rent',
          directive: 'template',
          priority: 1,
        },
        {
          type: 'by',
          amount: 1200,
          month: '2024-12',
          annual: false,
          directive: 'template',
          priority: 2,
        },
      ];
      await expect(
        CategoryTemplateContext.init(templates, category, '2024-01', 0),
      ).rejects.toThrow(
        /Schedule and By templates must be the same priority level/,
      );
    });

    it('throws when a non-recurring `by` target month is in the past', async () => {
      vi.mocked(statements.getActiveSchedules).mockResolvedValue(
        [] as Awaited<ReturnType<typeof statements.getActiveSchedules>>,
      );
      const templates: Template[] = [
        {
          type: 'by',
          amount: 1200,
          month: '2023-12',
          annual: false,
          directive: 'template',
          priority: 1,
        },
      ];
      await expect(
        CategoryTemplateContext.init(templates, category, '2024-06', 0),
      ).rejects.toThrow(
        /Target month has passed, remove or update the target month/,
      );
    });

    it('accepts a past `by` target when annual or repeat is set (engine rolls it forward)', async () => {
      vi.mocked(statements.getActiveSchedules).mockResolvedValue(
        [] as Awaited<ReturnType<typeof statements.getActiveSchedules>>,
      );
      const templates: Template[] = [
        {
          type: 'by',
          amount: 1200,
          month: '2023-12',
          annual: true,
          directive: 'template',
          priority: 1,
        },
      ];
      await expect(
        CategoryTemplateContext.init(templates, category, '2024-06', 0),
      ).resolves.toBeDefined();
    });

    it('throws when a percentage template references an unknown income category', async () => {
      vi.mocked(statements.getActiveSchedules).mockResolvedValue(
        [] as Awaited<ReturnType<typeof statements.getActiveSchedules>>,
      );
      vi.mocked(db.getCategories).mockResolvedValue([
        {
          id: 'inc-1',
          name: 'Salary',
          is_income: 1,
          cat_group: 'g-income',
          sort_order: 0,
          hidden: 0,
          tombstone: 0,
        } satisfies DbCategory,
      ]);
      const templates: Template[] = [
        {
          type: 'percentage',
          percent: 10,
          previous: false,
          category: 'Bonus',
          directive: 'template',
          priority: 1,
        },
      ];
      await expect(
        CategoryTemplateContext.init(templates, category, '2024-01', 0),
      ).rejects.toThrow(/is not found in available income categories/i);
    });

    it('rolls a past `by` target forward by its annual period', async () => {
      // Past target with annual:true is rolled forward by 12 months until
      // the target is in the future, then budgeted normally.
      vi.mocked(statements.getActiveSchedules).mockResolvedValue(
        [] as Awaited<ReturnType<typeof statements.getActiveSchedules>>,
      );
      const templates: Template[] = [
        {
          type: 'by',
          amount: 1200,
          month: '2023-12',
          annual: true,
          directive: 'template',
          priority: 1,
        },
      ];
      const ctx = await CategoryTemplateContext.init(
        templates,
        category,
        '2024-06',
        0,
      );
      const budgeted = await ctx.runTemplatesForPriority(
        1,
        1_000_000,
        1_000_000,
      );
      expect(budgeted).toBeGreaterThan(0);
    });

    it('accepts the special `all income` and `available funds` source aliases', async () => {
      vi.mocked(statements.getActiveSchedules).mockResolvedValue(
        [] as Awaited<ReturnType<typeof statements.getActiveSchedules>>,
      );
      vi.mocked(db.getCategories).mockResolvedValue([] as DbCategory[]);
      const templates: Template[] = [
        {
          type: 'percentage',
          percent: 10,
          previous: false,
          category: 'all income',
          directive: 'template',
          priority: 1,
        },
        {
          type: 'percentage',
          percent: 5,
          previous: false,
          category: 'available funds',
          directive: 'template',
          priority: 1,
        },
      ];
      await expect(
        CategoryTemplateContext.init(templates, category, '2024-01', 0),
      ).resolves.toBeDefined();
    });

    it('throws when more than one limit template is defined', () => {
      const templates: Template[] = [
        {
          type: 'limit',
          amount: 100,
          hold: false,
          period: 'monthly',
          directive: 'template',
          priority: null,
        },
        {
          type: 'limit',
          amount: 200,
          hold: false,
          period: 'monthly',
          directive: 'template',
          priority: null,
        },
      ];
      expect(
        () =>
          new TestCategoryTemplateContext(templates, category, '2024-01', 0, 0),
      ).toThrow(/Only one .up to. allowed per category/);
    });

    it('throws when a weekly limit has no start date', () => {
      const templates: Template[] = [
        {
          type: 'limit',
          amount: 50,
          hold: false,
          period: 'weekly',
          directive: 'template',
          priority: null,
        },
      ];
      expect(
        () =>
          new TestCategoryTemplateContext(templates, category, '2024-01', 0, 0),
      ).toThrow(/Weekly limit requires a start date/);
    });

    it('throws when a limit period is not daily/weekly/monthly', () => {
      const templates: Template[] = [
        {
          type: 'limit',
          amount: 50,
          hold: false,
          // @ts-expect-error deliberately invalid period value
          period: 'fortnightly',
          directive: 'template',
          priority: null,
        },
      ];
      expect(
        () =>
          new TestCategoryTemplateContext(templates, category, '2024-01', 0, 0),
      ).toThrow(/Invalid limit period/);
    });

    it('throws when more than one spend template is defined', () => {
      const templates: Template[] = [
        {
          type: 'spend',
          amount: 100,
          from: '2024-01',
          month: '2024-12',
          directive: 'template',
          priority: 1,
        },
        {
          type: 'spend',
          amount: 200,
          from: '2024-01',
          month: '2024-12',
          directive: 'template',
          priority: 1,
        },
      ];
      expect(
        () =>
          new TestCategoryTemplateContext(templates, category, '2024-01', 0, 0),
      ).toThrow(/Only one spend template is allowed per category/);
    });

    it('throws when more than one #goal directive is defined', () => {
      const templates: Template[] = [
        { type: 'goal', amount: 1000, directive: 'goal' },
        { type: 'goal', amount: 2000, directive: 'goal' },
      ];
      expect(
        () =>
          new TestCategoryTemplateContext(templates, category, '2024-01', 0, 0),
      ).toThrow(/Only one #goal is allowed per category/);
    });

    it('throws when a periodic template uses an unknown period unit', async () => {
      vi.mocked(statements.getActiveSchedules).mockResolvedValue(
        [] as Awaited<ReturnType<typeof statements.getActiveSchedules>>,
      );
      const templates: Template[] = [
        {
          type: 'periodic',
          amount: 100,
          // @ts-expect-error deliberately invalid period unit
          period: { period: 'fortnight', amount: 1 },
          starting: '2024-01-01',
          directive: 'template',
          priority: 1,
        },
      ];
      const ctx = await CategoryTemplateContext.init(
        templates,
        category,
        '2024-01',
        0,
      );
      await expect(
        ctx.runTemplatesForPriority(1, 1_000_000, 1_000_000),
      ).rejects.toThrow(/Unrecognized periodic period/);
    });
  });

  describe('further engine coverage', () => {
    const category: CategoryEntity = {
      id: 'engine-cat',
      name: 'Engine Category',
      group: 'g',
      is_income: false,
    };
    const incomeCategory: CategoryEntity = {
      id: 'income-cat',
      name: 'Income',
      group: 'g',
      is_income: true,
    };

    it('clamps remainder allocation when the per-category cap is reached', () => {
      // Cap $100, carryover $30 → remainder can only contribute up to $70
      // to fill the gap, even though perWeight × weight would give $80.
      const templates: Template[] = [
        {
          type: 'limit',
          amount: 100,
          hold: false,
          period: 'monthly',
          directive: 'template',
          priority: null,
        },
        {
          type: 'remainder',
          weight: 1,
          directive: 'template',
          priority: null,
        },
      ];
      const instance = new TestCategoryTemplateContext(
        templates,
        category,
        '2024-01',
        3000,
        0,
      );
      expect(instance.runRemainder(10000, 8000)).toBe(7000);
    });

    it('drops sub-dollar amounts from remainder when hideDecimal is set', () => {
      const templates: Template[] = [
        {
          type: 'remainder',
          weight: 1,
          directive: 'template',
          priority: null,
        },
      ];
      const instance = new TestCategoryTemplateContext(
        templates,
        category,
        '2024-01',
        0,
        0,
        'USD',
        true,
      );
      const result = instance.runRemainder(20000, 12345);
      expect(result).toBe(12300);
    });

    it('negates the budget for income categories at non-zero priority', async () => {
      // Income categories produce funds rather than consume them.
      const templates: Template[] = [
        {
          type: 'periodic',
          amount: 100,
          period: { period: 'month', amount: 1 },
          starting: '2024-01-01',
          directive: 'template',
          priority: 1,
        },
      ];
      const instance = new TestCategoryTemplateContext(
        templates,
        incomeCategory,
        '2024-01',
        0,
        0,
      );
      const result = await instance.runTemplatesForPriority(
        1,
        1_000_000,
        1_000_000,
      );
      expect(result).toBe(-10000);
    });

    it('reports limit excess when carried-over balance exceeds a weekly cap', () => {
      // Aggregate cap = 5 week-starts in Jan 2024 × $50 = $250. Carryover
      // $300 → excess $50.
      const templates: Template[] = [
        {
          type: 'limit',
          amount: 50,
          hold: false,
          period: 'weekly',
          start: '2024-01-01',
          directive: 'template',
          priority: null,
        },
      ];
      const instance = new TestCategoryTemplateContext(
        templates,
        category,
        '2024-01',
        30000,
        0,
      );
      expect(instance.getLimitExcess()).toBe(5000);
    });

    it('runAll iterates priorities in order and budgets the high-priority template first', async () => {
      const templates: Template[] = [
        {
          type: 'periodic',
          amount: 100,
          period: { period: 'month', amount: 1 },
          starting: '2024-01-01',
          directive: 'template',
          priority: 1,
        },
        {
          type: 'periodic',
          amount: 50,
          period: { period: 'month', amount: 1 },
          starting: '2024-01-01',
          directive: 'template',
          priority: 2,
        },
      ];
      const instance = new TestCategoryTemplateContext(
        templates,
        category,
        '2024-01',
        0,
        0,
      );
      const total = await instance.runAll(1_000_000);
      expect(total).toBe(15000);
      const values = instance.getValues();
      expect(values.budgeted).toBe(15000);
    });

    it('partial-month coverage when a weekly limit starts mid-month', async () => {
      // Week-starts in January from 2024-01-15: 15, 22, 29 → 3 × $50.
      const templates: Template[] = [
        {
          type: 'simple',
          monthly: 200,
          limit: {
            amount: 50,
            hold: false,
            period: 'weekly',
            start: '2024-01-15',
          },
          directive: 'template',
          priority: 1,
        },
      ];
      const instance = new TestCategoryTemplateContext(
        templates,
        category,
        '2024-01',
        0,
        0,
      );
      const result = await instance.runTemplatesForPriority(
        1,
        1_000_000,
        1_000_000,
      );
      expect(result).toBe(15000);
    });

    it('does not double-count weeks for a weekly limit starting before the month', async () => {
      // Limit starts in Dec; only the 5 week-starts inside Jan (1, 8, 15,
      // 22, 29) count.
      const templates: Template[] = [
        {
          type: 'simple',
          monthly: 1000,
          limit: {
            amount: 100,
            hold: false,
            period: 'weekly',
            start: '2023-12-25',
          },
          directive: 'template',
          priority: 1,
        },
      ];
      const instance = new TestCategoryTemplateContext(
        templates,
        category,
        '2024-01',
        0,
        0,
      );
      const result = await instance.runTemplatesForPriority(
        1,
        1_000_000,
        1_000_000,
      );
      expect(result).toBe(50000);
    });

    it('returns zero excess when hold is set on a weekly limit, even with carryover above the cap', () => {
      // hold=true keeps the surplus in the category rather than releasing
      // it back to To Budget.
      const templates: Template[] = [
        {
          type: 'limit',
          amount: 50,
          hold: true,
          period: 'weekly',
          start: '2024-01-01',
          directive: 'template',
          priority: null,
        },
      ];
      const instance = new TestCategoryTemplateContext(
        templates,
        category,
        '2024-01',
        30000,
        0,
      );
      expect(instance.getLimitExcess()).toBe(0);
    });

    it('uses the actual day count for a daily limit in February (28 days)', async () => {
      const templates: Template[] = [
        {
          type: 'simple',
          monthly: 10000,
          limit: { amount: 10, hold: false, period: 'daily' },
          directive: 'template',
          priority: 1,
        },
      ];
      const instance = new TestCategoryTemplateContext(
        templates,
        category,
        '2023-02',
        0,
        0,
      );
      const result = await instance.runTemplatesForPriority(
        1,
        1_000_000,
        1_000_000,
      );
      expect(result).toBe(28000);
    });

    it('uses the actual day count for a daily limit in February of a leap year (29 days)', async () => {
      const templates: Template[] = [
        {
          type: 'simple',
          monthly: 10000,
          limit: { amount: 10, hold: false, period: 'daily' },
          directive: 'template',
          priority: 1,
        },
      ];
      const instance = new TestCategoryTemplateContext(
        templates,
        category,
        '2024-02',
        0,
        0,
      );
      const result = await instance.runTemplatesForPriority(
        1,
        1_000_000,
        1_000_000,
      );
      expect(result).toBe(29000);
    });
  });
});
