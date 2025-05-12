import { vi } from 'vitest';

import { amountToInteger } from '../../shared/util';
import { type CategoryEntity } from '../../types/models';
import * as db from '../db';

import * as actions from './actions';
import { CategoryTemplate } from './categoryTemplate';
import { type Template } from './types/templates';

// Mock getSheetValue and getCategories
vi.mock('./actions', () => ({
  getSheetValue: vi.fn(),
  getSheetBoolean: vi.fn(),
}));

vi.mock('../db', () => ({
  getCategories: vi.fn(),
}));

// Test helper class to access constructor and methods
class TestCategoryTemplate extends CategoryTemplate {
  public constructor(
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
        directive: 'template',
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
        directive: 'template',
        priority: 1,
      };

      const result = CategoryTemplate.runSimple(template, 500);
      expect(result).toBe(500);
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
      const instance = new TestCategoryTemplate(
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
      const instance = new TestCategoryTemplate(
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

  describe('runCopy', () => {
    let instance: TestCategoryTemplate;

    beforeEach(() => {
      const category: CategoryEntity = {
        id: 'test',
        name: 'Test Category',
        group: 'test-group',
        is_income: false,
      };
      instance = new TestCategoryTemplate([], category, '2024-01', 0, 0);
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

      const result = await CategoryTemplate.runCopy(template, instance);
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

      const result = await CategoryTemplate.runCopy(template, instance);
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

      const result = await CategoryTemplate.runCopy(template, instance);
      expect(result).toBe(0);
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

    //5 mondays in January 2024
    it('should calculate weekly amount for single week', () => {
      const template: Template = {
        type: 'week',
        amount: 100,
        weeks: 1,
        starting: '2024-01-01',
        directive: 'template',
        priority: 1,
      };

      const result = CategoryTemplate.runWeek(template, instance);
      expect(result).toBe(amountToInteger(500));
    });

    it('should calculate weekly amount for multiple weeks', () => {
      const template: Template = {
        type: 'week',
        amount: 100,
        weeks: 2,
        starting: '2024-01-01',
        directive: 'template',
        priority: 1,
      };

      const result = CategoryTemplate.runWeek(template, instance);
      expect(result).toBe(amountToInteger(300));
    });

    it('should handle weeks spanning multiple months', () => {
      const template: Template = {
        type: 'week',
        amount: 100,
        weeks: 7,
        starting: '2023-12-04',
        directive: 'template',
        priority: 1,
      };

      const result = CategoryTemplate.runWeek(template, instance);
      expect(result).toBe(amountToInteger(100));
    });
  });

  describe('runSpend', () => {
    let instance: TestCategoryTemplate;

    beforeEach(() => {
      const category: CategoryEntity = {
        id: 'test',
        name: 'Test Category',
        group: 'test-group',
        is_income: false,
      };
      instance = new TestCategoryTemplate([], category, '2024-01', 0, 0);
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

      const result = await CategoryTemplate.runSpend(template, instance);
      expect(result).toBe(60000);
    });

    it('should handle repeating spend template', async () => {
      const template: Template = {
        type: 'spend',
        amount: 1000,
        from: '2023-11',
        month: '2023-12',
        //@ts-ignore this is what the template expects
        repeat: 3,
        directive: 'template',
        priority: 1,
      };

      vi.mocked(actions.getSheetValue)
        .mockResolvedValueOnce(-10000)
        .mockResolvedValueOnce(20000)
        .mockResolvedValueOnce(10000);

      const result = await CategoryTemplate.runSpend(template, instance);
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

      const result = await CategoryTemplate.runSpend(template, instance);
      expect(result).toBe(0);
    });
  });

  describe('runPercentage', () => {
    let instance: TestCategoryTemplate;

    beforeEach(() => {
      const category: CategoryEntity = {
        id: 'test',
        name: 'Test Category',
        group: 'test-group',
        is_income: false,
      };
      instance = new TestCategoryTemplate([], category, '2024-01', 0, 0);
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

      const result = await CategoryTemplate.runPercentage(
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

      const result = await CategoryTemplate.runPercentage(
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

      const result = await CategoryTemplate.runPercentage(
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

      const result = await CategoryTemplate.runPercentage(
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
    let instance: TestCategoryTemplate;

    beforeEach(() => {
      const category: CategoryEntity = {
        id: 'test',
        name: 'Test Category',
        group: 'test-group',
        is_income: false,
      };
      instance = new TestCategoryTemplate([], category, '2024-01', 0, 0);
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

      const result = await CategoryTemplate.runAverage(template, instance);
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

      const result = await CategoryTemplate.runAverage(template, instance);
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

      const result = await CategoryTemplate.runAverage(template, instance);
      expect(result).toBe(67); // Average of -100, 200, -300
    });
  });

  describe('runBy', () => {
    let instance: TestCategoryTemplate;

    beforeEach(() => {
      const category: CategoryEntity = {
        id: 'test',
        name: 'Test Category',
        group: 'test-group',
        is_income: false,
      };
      instance = new TestCategoryTemplate(
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
      const result = CategoryTemplate.runBy(instance);
      expect(result).toBe(66667);
    });

    it('should handle repeating targets', () => {
      instance = new TestCategoryTemplate(
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

      const result = CategoryTemplate.runBy(instance);
      expect(result).toBe(83333);
    });

    it('should handle existing balance', () => {
      instance = new TestCategoryTemplate(
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

      const result = CategoryTemplate.runBy(instance);
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
      const instance = new TestCategoryTemplate(
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
      const instance = new TestCategoryTemplate(
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
      const instance = new TestCategoryTemplate(
        templates,
        category,
        '2024-01',
        300,
        0,
      );
      const result = await instance.getLimitExcess();
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
      const instance = new TestCategoryTemplate(
        templates,
        category,
        '2024-01',
        30000,
        0,
      );
      const result = await instance.getLimitExcess();
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
        },
      ];
      const instance = new TestCategoryTemplate(
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
        },
      ];
      const instance = new TestCategoryTemplate(
        templates,
        category,
        '2024-01',
        0,
        0,
      );
      const result = instance.runRemainder(101, 100);
      expect(result).toBe(101);
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
        },
      ];
      const instance = new TestCategoryTemplate(
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
        },
      ];

      // Mock the sheet values needed for init
      vi.mocked(actions.getSheetValue).mockResolvedValueOnce(0); // lastMonthBalance
      vi.mocked(actions.getSheetBoolean).mockResolvedValueOnce(false); // carryover

      // Initialize the template
      const instance = await CategoryTemplate.init(
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

      // Initialize the template
      const instance = await CategoryTemplate.init(
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
        },
      ];

      // Mock the sheet values needed for init
      vi.mocked(actions.getSheetValue).mockResolvedValueOnce(0); // lastMonthBalance
      vi.mocked(actions.getSheetBoolean).mockResolvedValueOnce(false); // carryover

      // Initialize the template
      const instance = await CategoryTemplate.init(
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

      // Initialize the template
      const instance = await CategoryTemplate.init(
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
      expect(instance.getGoalOnly()).toBe(false); // Should not be goal only
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

      // Initialize the template
      const instance = await CategoryTemplate.init(
        templates,
        category,
        '2024-01',
        10000,
      );

      expect(instance.getGoalOnly()).toBe(true); // Should be goal only
      // Get the final values
      const values = instance.getValues();

      // Verify the results
      expect(values.budgeted).toBe(10000);
      expect(values.goal).toBe(100000); // Should be the goal amount
      expect(values.longGoal).toBe(true); // Should have a long goal
    });
  });
});
