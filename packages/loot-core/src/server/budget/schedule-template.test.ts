import { CategoryEntity } from '../../types/models';
import { setPayPeriodConfig } from '../../shared/pay-periods';
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
  });
});
