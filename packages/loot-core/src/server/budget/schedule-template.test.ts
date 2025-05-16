import { CategoryEntity } from '../../types/models';
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
        directive: '#template schedule Test Schedule',
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
        directive: '#template schedule Test Schedule',
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
});
