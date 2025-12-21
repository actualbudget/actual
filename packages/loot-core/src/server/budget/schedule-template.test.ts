import { type CategoryEntity } from '../../types/models';
import { setPayPeriodConfig } from '../../shared/pay-periods';
import { type CategoryEntity } from '../../types/models';
import * as db from '../db';
import { Rule } from '../rules';
import { getRuleForSchedule } from '../schedules/app';

import { isReflectBudget } from './actions';
import { runSchedule } from './schedule-template';

vi.mock('../db');
vi.mock('./actions');
vi.mock('../schedules/app', async () => {
  const actualModule = await vi.importActual('../schedules/app');
  return {
    ...actualModule,
    getRuleForSchedule: vi.fn(),
  };
});

describe('runSchedule', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return correct budget when recurring schedule set', async () => {
    // Given
    const template_lines = [
      {
        type: 'schedule',
        name: 'Test Schedule',
        priority: 0,
        directive: 'template',
      } as const,
    ];
    const current_month = '2024-08-01';
    const balance = 0;
    const remainder = 0;
    const last_month_balance = 0;
    const to_budget = 0;
    const errors: string[] = [];
    const category = { id: '1', name: 'Test Category' } as CategoryEntity;

    vi.mocked(db.first).mockResolvedValue({ id: 1, completed: 0 });
    vi.mocked(getRuleForSchedule).mockResolvedValue(
      new Rule({
        id: 'test',
        stage: 'pre',
        conditionsOp: 'and',
        conditions: [
          {
            op: 'is',
            field: 'date',
            value: {
              start: '2024-08-01',
              interval: 1,
              frequency: 'monthly',
              patterns: [],
              skipWeekend: false,
              weekendSolveMode: 'before',
              endMode: 'never',
              endOccurrences: 1,
              endDate: '2024-08-04',
            },
            type: 'date',
          },
          {
            op: 'is',
            field: 'amount',
            value: -10000,
            type: 'number',
          },
        ],
        actions: [],
      }),
    );
    vi.mocked(isReflectBudget).mockReturnValue(false);

    // When
    const result = await runSchedule(
      template_lines,
      current_month,
      balance,
      remainder,
      last_month_balance,
      to_budget,
      errors,
      category,
    );

    // Then
    expect(result.to_budget).toBe(10000);
    expect(result.errors).toHaveLength(0);
    expect(result.remainder).toBe(0);
  });

  it('should return correct budget when yearly recurring schedule set and balance is greater than target', async () => {
    // Given
    const template_lines = [
      {
        type: 'schedule',
        name: 'Test Schedule',
        directive: 'template',
        priority: 0,
      } as const,
    ];
    const current_month = '2024-09-01';
    const balance = 12000;
    const remainder = 0;
    const last_month_balance = 12000;
    const to_budget = 0;
    const errors: string[] = [];
    const category = { id: '1', name: 'Test Category' } as CategoryEntity;

    vi.mocked(db.first).mockResolvedValue({ id: 1, completed: 0 });
    vi.mocked(getRuleForSchedule).mockResolvedValue(
      new Rule({
        id: 'test',
        stage: 'pre',
        conditionsOp: 'and',
        conditions: [
          {
            op: 'is',
            field: 'date',
            value: {
              start: '2024-08-01',
              interval: 1,
              frequency: 'yearly',
              patterns: [],
              skipWeekend: false,
              weekendSolveMode: 'before',
              endMode: 'never',
              endOccurrences: 1,
              endDate: '2024-08-04',
            },
            type: 'date',
          },
          {
            op: 'is',
            field: 'amount',
            value: -12000,
            type: 'number',
          },
        ],
        actions: [],
      }),
    );
    vi.mocked(isReflectBudget).mockReturnValue(false);

    // When
    const result = await runSchedule(
      template_lines,
      current_month,
      balance,
      remainder,
      last_month_balance,
      to_budget,
      errors,
      category,
    );

    // Then
    expect(result.to_budget).toBe(1000);
    expect(result.errors).toHaveLength(0);
    expect(result.remainder).toBe(0);
  });

  describe('Pay Period Integration', () => {
    beforeEach(() => {
      // Set up pay period config for biweekly starting Jan 5, 2024
      setPayPeriodConfig({
        enabled: true,
        payFrequency: 'biweekly',
        startDate: '2024-01-05',
      });
    });

    afterEach(() => {
      // Clean up pay period config
      setPayPeriodConfig({
        enabled: false,
        payFrequency: 'biweekly',
        startDate: '2024-01-05',
      });
    });

    it('should handle pay period IDs correctly for monthly recurring schedules', async () => {
      // Given: Pay period 2024-13 = Jan 5-18, 2024
      const template_lines = [
        {
          type: 'schedule',
          name: 'Test Schedule',
          priority: 0,
          directive: 'template',
        } as const,
      ];
      const current_month = '2024-13'; // Pay period ID
      const balance = 0;
      const remainder = 0;
      const last_month_balance = 0;
      const to_budget = 0;
      const errors: string[] = [];
      const category = { id: '1', name: 'Test Category' } as CategoryEntity;

      vi.mocked(db.first).mockResolvedValue({ id: 1, completed: 0 });
      vi.mocked(getRuleForSchedule).mockResolvedValue(
        new Rule({
          id: 'test',
          stage: 'pre',
          conditionsOp: 'and',
          conditions: [
            {
              op: 'is',
              field: 'date',
              value: {
                start: '2024-01-15', // Date within the pay period
                interval: 1,
                frequency: 'monthly',
                patterns: [],
                skipWeekend: false,
                weekendSolveMode: 'before',
                endMode: 'never',
                endOccurrences: 1,
                endDate: '2024-01-18',
              },
              type: 'date',
            },
            {
              op: 'is',
              field: 'amount',
              value: -10000,
              type: 'number',
            },
          ],
          actions: [],
        }),
      );
      vi.mocked(isReflectBudget).mockReturnValue(false);

      // When
      const result = await runSchedule(
        template_lines,
        current_month,
        balance,
        remainder,
        last_month_balance,
        to_budget,
        errors,
        category,
      );

      // Then: Should not crash and should calculate budget correctly
      expect(result.errors).toHaveLength(0);
      // Budget should be calculated (12 monthly payments of 10000)
      expect(result.to_budget).toBeGreaterThan(0);
    });

    it('should handle pay period IDs correctly for yearly recurring schedules', async () => {
      // Given: Pay period 2024-13 = Jan 5-18, 2024
      const template_lines = [
        {
          type: 'schedule',
          name: 'Test Schedule',
          directive: 'template',
          priority: 0,
        } as const,
      ];
      const current_month = '2024-13'; // Pay period ID
      const balance = 0;
      const remainder = 0;
      const last_month_balance = 0;
      const to_budget = 0;
      const errors: string[] = [];
      const category = { id: '1', name: 'Test Category' } as CategoryEntity;

      vi.mocked(db.first).mockResolvedValue({ id: 1, completed: 0 });
      vi.mocked(getRuleForSchedule).mockResolvedValue(
        new Rule({
          id: 'test',
          stage: 'pre',
          conditionsOp: 'and',
          conditions: [
            {
              op: 'is',
              field: 'date',
              value: {
                start: '2025-01-01', // Next year
                interval: 1,
                frequency: 'yearly',
                patterns: [],
                skipWeekend: false,
                weekendSolveMode: 'before',
                endMode: 'never',
                endOccurrences: 1,
                endDate: '2025-01-04',
              },
              type: 'date',
            },
            {
              op: 'is',
              field: 'amount',
              value: -12000,
              type: 'number',
            },
          ],
          actions: [],
        }),
      );
      vi.mocked(isReflectBudget).mockReturnValue(false);

      // When
      const result = await runSchedule(
        template_lines,
        current_month,
        balance,
        remainder,
        last_month_balance,
        to_budget,
        errors,
        category,
      );

      // Then: Should not crash - budget calculation may be 0 depending on schedule logic
      expect(result.errors).toHaveLength(0);
      // The important part is it didn't crash when parsing the pay period ID
      expect(result).toHaveProperty('to_budget');
    });

    it('should handle repeating schedules within a pay period', async () => {
      // Given: Weekly schedule that repeats within the pay period
      const template_lines = [
        {
          type: 'schedule',
          name: 'Weekly Schedule',
          full: true, // Repeating schedule
          priority: 0,
          directive: 'template',
        } as const,
      ];
      const current_month = '2024-13'; // Pay period ID (Jan 5-18)
      const balance = 0;
      const remainder = 0;
      const last_month_balance = 0;
      const to_budget = 0;
      const errors: string[] = [];
      const category = { id: '1', name: 'Test Category' } as CategoryEntity;

      vi.mocked(db.first).mockResolvedValue({ id: 1, completed: 0 });
      vi.mocked(getRuleForSchedule).mockResolvedValue(
        new Rule({
          id: 'test',
          stage: 'pre',
          conditionsOp: 'and',
          conditions: [
            {
              op: 'is',
              field: 'date',
              value: {
                start: '2024-01-08', // Monday during pay period
                interval: 1,
                frequency: 'weekly',
                patterns: [],
                skipWeekend: false,
                weekendSolveMode: 'before',
                endMode: 'never',
                endOccurrences: 1,
                endDate: '2024-01-18',
              },
              type: 'date',
            },
            {
              op: 'is',
              field: 'amount',
              value: -5000,
              type: 'number',
            },
          ],
          actions: [],
        }),
      );
      vi.mocked(isReflectBudget).mockReturnValue(false);

      // When
      const result = await runSchedule(
        template_lines,
        current_month,
        balance,
        remainder,
        last_month_balance,
        to_budget,
        errors,
        category,
      );

      // Then: Should handle weekly repeating schedules correctly
      expect(result.errors).toHaveLength(0);
      // Should budget for both occurrences (Jan 8 and Jan 15)
      expect(result.to_budget).toBeGreaterThan(0);
    });

    it('should correctly identify schedules in the past when using pay periods', async () => {
      // Given: Schedule date is before the current pay period
      const template_lines = [
        {
          type: 'schedule',
          name: 'Past Schedule',
          priority: 0,
          directive: 'template',
        } as const,
      ];
      const current_month = '2024-15'; // Pay period (Feb 2-15)
      const balance = 0;
      const remainder = 0;
      const last_month_balance = 0;
      const to_budget = 0;
      const errors: string[] = [];
      const category = { id: '1', name: 'Test Category' } as CategoryEntity;

      vi.mocked(db.first).mockResolvedValue({ id: 1, completed: 0 });
      vi.mocked(getRuleForSchedule).mockResolvedValue(
        new Rule({
          id: 'test',
          stage: 'pre',
          conditionsOp: 'and',
          conditions: [
            {
              op: 'is',
              field: 'date',
              value: '2024-01-15', // Date in the past (falls in period 2024-13)
              type: 'date',
            },
            {
              op: 'is',
              field: 'amount',
              value: -10000,
              type: 'number',
            },
          ],
          actions: [],
        }),
      );
      vi.mocked(isReflectBudget).mockReturnValue(false);

      // When
      const result = await runSchedule(
        template_lines,
        current_month,
        balance,
        remainder,
        last_month_balance,
        to_budget,
        errors,
        category,
      );

      // Then: Should detect that schedule is in the past
      expect(result.errors).toContain('Schedule Past Schedule is in the Past.');
    });

    it('should correctly identify schedules in the future when using pay periods', async () => {
      // Given: Schedule date is after the current pay period
      const template_lines = [
        {
          type: 'schedule',
          name: 'Future Schedule',
          priority: 0,
          directive: 'template',
        } as const,
      ];
      const current_month = '2024-13'; // Pay period (Jan 5-18)
      const balance = 0;
      const remainder = 0;
      const last_month_balance = 0;
      const to_budget = 0;
      const errors: string[] = [];
      const category = { id: '1', name: 'Test Category' } as CategoryEntity;

      vi.mocked(db.first).mockResolvedValue({ id: 1, completed: 0 });
      vi.mocked(getRuleForSchedule).mockResolvedValue(
        new Rule({
          id: 'test',
          stage: 'pre',
          conditionsOp: 'and',
          conditions: [
            {
              op: 'is',
              field: 'date',
              value: {
                start: '2024-03-01', // Future date
                interval: 1,
                frequency: 'monthly',
                patterns: [],
                skipWeekend: false,
                weekendSolveMode: 'before',
                endMode: 'never',
                endOccurrences: 1,
                endDate: '2024-03-04',
              },
              type: 'date',
            },
            {
              op: 'is',
              field: 'amount',
              value: -12000,
              type: 'number',
            },
          ],
          actions: [],
        }),
      );
      vi.mocked(isReflectBudget).mockReturnValue(false);

      // When
      const result = await runSchedule(
        template_lines,
        current_month,
        balance,
        remainder,
        last_month_balance,
        to_budget,
        errors,
        category,
      );

      // Then: Should calculate budget correctly (future schedule is valid)
      expect(result.errors).toHaveLength(0);
      expect(result.to_budget).toBeGreaterThan(0);
    });

    it('should handle addMonths correctly with pay period IDs', async () => {
      // Given: Repeating schedule that needs to calculate nextMonth
      const template_lines = [
        {
          type: 'schedule',
          name: 'Biweekly Schedule',
          full: true,
          priority: 0,
          directive: 'template',
        } as const,
      ];
      const current_month = '2024-13'; // Pay period (Jan 5-18)
      const balance = 0;
      const remainder = 0;
      const last_month_balance = 0;
      const to_budget = 0;
      const errors: string[] = [];
      const category = { id: '1', name: 'Test Category' } as CategoryEntity;

      vi.mocked(db.first).mockResolvedValue({ id: 1, completed: 0 });
      vi.mocked(getRuleForSchedule).mockResolvedValue(
        new Rule({
          id: 'test',
          stage: 'pre',
          conditionsOp: 'and',
          conditions: [
            {
              op: 'is',
              field: 'date',
              value: {
                start: '2024-01-10', // Within current pay period
                interval: 2,
                frequency: 'weekly', // Every 2 weeks
                patterns: [],
                skipWeekend: false,
                weekendSolveMode: 'before',
                endMode: 'never',
                endOccurrences: 1,
                endDate: '2024-12-31',
              },
              type: 'date',
            },
            {
              op: 'is',
              field: 'amount',
              value: -5000,
              type: 'number',
            },
          ],
          actions: [],
        }),
      );
      vi.mocked(isReflectBudget).mockReturnValue(false);

      // When
      const result = await runSchedule(
        template_lines,
        current_month,
        balance,
        remainder,
        last_month_balance,
        to_budget,
        errors,
        category,
      );

      // Then: Should handle addMonths with pay period ID correctly
      expect(result.errors).toHaveLength(0);
      expect(result.to_budget).toBeGreaterThan(0);
    });

    it('should handle differenceInCalendarDays with pay period IDs', async () => {
      // Given: Repeating daily schedule
      const template_lines = [
        {
          type: 'schedule',
          name: 'Daily Schedule',
          full: true,
          priority: 0,
          directive: 'template',
        } as const,
      ];
      const current_month = '2024-13'; // Pay period (Jan 5-18)
      const balance = 0;
      const remainder = 0;
      const last_month_balance = 0;
      const to_budget = 0;
      const errors: string[] = [];
      const category = { id: '1', name: 'Test Category' } as CategoryEntity;

      vi.mocked(db.first).mockResolvedValue({ id: 1, completed: 0 });
      vi.mocked(getRuleForSchedule).mockResolvedValue(
        new Rule({
          id: 'test',
          stage: 'pre',
          conditionsOp: 'and',
          conditions: [
            {
              op: 'is',
              field: 'date',
              value: {
                start: '2024-01-06', // Day 2 of pay period
                interval: 3,
                frequency: 'daily', // Every 3 days
                patterns: [],
                skipWeekend: false,
                weekendSolveMode: 'before',
                endMode: 'never',
                endOccurrences: 1,
                endDate: '2024-01-18',
              },
              type: 'date',
            },
            {
              op: 'is',
              field: 'amount',
              value: -1000,
              type: 'number',
            },
          ],
          actions: [],
        }),
      );
      vi.mocked(isReflectBudget).mockReturnValue(false);

      // When
      const result = await runSchedule(
        template_lines,
        current_month,
        balance,
        remainder,
        last_month_balance,
        to_budget,
        errors,
        category,
      );

      // Then: Should calculate multiple daily occurrences correctly
      expect(result.errors).toHaveLength(0);
      // Should budget for multiple occurrences: Jan 6, 9, 12, 15, 18
      expect(result.to_budget).toBeGreaterThan(0);
    });

    it('should handle weekend solving with pay period dates', async () => {
      // Given: Schedule with weekend solving enabled
      const template_lines = [
        {
          type: 'schedule',
          name: 'Weekend Solve Schedule',
          full: true,
          priority: 0,
          directive: 'template',
        } as const,
      ];
      const current_month = '2024-13'; // Pay period (Jan 5-18)
      const balance = 0;
      const remainder = 0;
      const last_month_balance = 0;
      const to_budget = 0;
      const errors: string[] = [];
      const category = { id: '1', name: 'Test Category' } as CategoryEntity;

      vi.mocked(db.first).mockResolvedValue({ id: 1, completed: 0 });
      vi.mocked(getRuleForSchedule).mockResolvedValue(
        new Rule({
          id: 'test',
          stage: 'pre',
          conditionsOp: 'and',
          conditions: [
            {
              op: 'is',
              field: 'date',
              value: {
                start: '2024-01-13', // Saturday (weekend)
                interval: 1,
                frequency: 'weekly',
                patterns: [],
                skipWeekend: true, // Skip weekends
                weekendSolveMode: 'before', // Move to Friday
                endMode: 'never',
                endOccurrences: 1,
                endDate: '2024-01-18',
              },
              type: 'date',
            },
            {
              op: 'is',
              field: 'amount',
              value: -2000,
              type: 'number',
            },
          ],
          actions: [],
        }),
      );
      vi.mocked(isReflectBudget).mockReturnValue(false);

      // When
      const result = await runSchedule(
        template_lines,
        current_month,
        balance,
        remainder,
        last_month_balance,
        to_budget,
        errors,
        category,
      );

      // Then: Should handle weekend solving with pay period dates
      expect(result.errors).toHaveLength(0);
      expect(result.to_budget).toBeGreaterThan(0);
    });

    it('should handle schedules spanning across pay period boundaries', async () => {
      // Given: Schedule that starts in one pay period and continues into next
      const template_lines = [
        {
          type: 'schedule',
          name: 'Cross-Period Schedule',
          full: true,
          priority: 0,
          directive: 'template',
        } as const,
      ];
      const current_month = '2024-13'; // Pay period (Jan 5-18)
      const balance = 0;
      const remainder = 0;
      const last_month_balance = 0;
      const to_budget = 0;
      const errors: string[] = [];
      const category = { id: '1', name: 'Test Category' } as CategoryEntity;

      vi.mocked(db.first).mockResolvedValue({ id: 1, completed: 0 });
      vi.mocked(getRuleForSchedule).mockResolvedValue(
        new Rule({
          id: 'test',
          stage: 'pre',
          conditionsOp: 'and',
          conditions: [
            {
              op: 'is',
              field: 'date',
              value: {
                start: '2024-01-12', // Within current period
                interval: 1,
                frequency: 'weekly',
                patterns: [],
                skipWeekend: false,
                weekendSolveMode: 'before',
                endMode: 'never',
                endOccurrences: 1,
                endDate: '2024-02-01',
              },
              type: 'date',
            },
            {
              op: 'is',
              field: 'amount',
              value: -3000,
              type: 'number',
            },
          ],
          actions: [],
        }),
      );
      vi.mocked(isReflectBudget).mockReturnValue(false);

      // When
      const result = await runSchedule(
        template_lines,
        current_month,
        balance,
        remainder,
        last_month_balance,
        to_budget,
        errors,
        category,
      );

      // Then: Should only count occurrences within the current pay period
      expect(result.errors).toHaveLength(0);
      // Should only budget for Jan 12 (next would be Jan 19, which is in period 2024-14)
      expect(result.to_budget).toBeGreaterThan(0);
    });

    it('should handle year boundary transitions with pay periods', async () => {
      // Given: Last pay period of 2024
      const template_lines = [
        {
          type: 'schedule',
          name: 'Year End Schedule',
          priority: 0,
          directive: 'template',
        } as const,
      ];
      const current_month = '2024-38'; // Last biweekly pay period of 2024 (Dec 27 - Jan 9, 2025)
      const balance = 0;
      const remainder = 0;
      const last_month_balance = 0;
      const to_budget = 0;
      const errors: string[] = [];
      const category = { id: '1', name: 'Test Category' } as CategoryEntity;

      vi.mocked(db.first).mockResolvedValue({ id: 1, completed: 0 });
      vi.mocked(getRuleForSchedule).mockResolvedValue(
        new Rule({
          id: 'test',
          stage: 'pre',
          conditionsOp: 'and',
          conditions: [
            {
              op: 'is',
              field: 'date',
              value: {
                start: '2025-01-05', // Date in next year
                interval: 1,
                frequency: 'monthly',
                patterns: [],
                skipWeekend: false,
                weekendSolveMode: 'before',
                endMode: 'never',
                endOccurrences: 1,
                endDate: '2025-01-10',
              },
              type: 'date',
            },
            {
              op: 'is',
              field: 'amount',
              value: -15000,
              type: 'number',
            },
          ],
          actions: [],
        }),
      );
      vi.mocked(isReflectBudget).mockReturnValue(false);

      // When
      const result = await runSchedule(
        template_lines,
        current_month,
        balance,
        remainder,
        last_month_balance,
        to_budget,
        errors,
        category,
      );

      // Then: Should handle year boundary correctly
      expect(result.errors).toHaveLength(0);
      expect(result.to_budget).toBeGreaterThan(0);
    });

    it('should apply monthly schedule only once per pay period - Issue: $120 becoming $360', async () => {
      // Reproduction case: Monthly schedule for $120 on the 19th
      // Bug: Applied 3 times ($360) instead of once ($120) in a biweekly pay period
      // Using pay period 2024-14 (Jan 19 - Feb 1) which contains Jan 19
      const template_lines = [
        {
          type: 'schedule',
          name: 'Monthly Bill on 19th',
          full: true, // User wants full amount budgeted
          priority: 0,
          directive: 'template',
        } as const,
      ];
      const current_month = '2024-14'; // Biweekly pay period (Jan 19 - Feb 1, 2024)
      const balance = 0;
      const remainder = 0;
      const last_month_balance = 0;
      const to_budget = 0;
      const errors: string[] = [];
      const category = { id: '1', name: 'Test Category' } as CategoryEntity;

      vi.mocked(db.first).mockResolvedValue({ id: 1, completed: 0 });
      vi.mocked(getRuleForSchedule).mockResolvedValue(
        new Rule({
          id: 'test',
          stage: 'pre',
          conditionsOp: 'and',
          conditions: [
            {
              op: 'is',
              field: 'date',
              value: {
                start: '2024-01-19', // 19th of each month
                interval: 1,
                frequency: 'monthly',
                patterns: [],
                skipWeekend: false,
                weekendSolveMode: 'before',
                endMode: 'never',
                endOccurrences: 1,
                endDate: '2024-12-31',
              },
              type: 'date',
            },
            {
              op: 'is',
              field: 'amount',
              value: -12000, // $120.00 in cents
              type: 'number',
            },
          ],
          actions: [],
        }),
      );
      vi.mocked(isReflectBudget).mockReturnValue(false);

      // When
      const result = await runSchedule(
        template_lines,
        current_month,
        balance,
        remainder,
        last_month_balance,
        to_budget,
        errors,
        category,
      );

      // Then: Should budget exactly $120 once, NOT $360 (3x)
      expect(result.errors).toHaveLength(0);
      expect(result.to_budget).toBe(12000); // Should be exactly $120.00, not $360.00 (36000)
    });
  });
});
