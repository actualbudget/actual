import * as db from '../../db';
import { getRuleForSchedule } from '../../schedules/app';
import { isReflectBudget } from '../actions';

import { goalsSchedule } from './goalsSchedule';

jest.mock('../../db');
jest.mock('../actions');
jest.mock('../../schedules/app', () => {
  const actualModule = jest.requireActual('../../schedules/app');
  return {
    ...actualModule,
    getRuleForSchedule: jest.fn(),
  };
});

describe('goalsSchedule', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return correct budget when recurring schedule set', async () => {
    // Given
    const scheduleFlag = false;
    const template_lines = [{ type: 'schedule', name: 'Test Schedule' }];
    const current_month = '2024-08-01';
    const balance = 0;
    const remainder = 0;
    const last_month_balance = 0;
    const to_budget = 0;
    const errors: string[] = [];
    const category = { id: 1, name: 'Test Category' };

    (db.first as jest.Mock).mockResolvedValue({ id: 1, completed: 0 });
    (getRuleForSchedule as jest.Mock).mockResolvedValue({
      serialize: () => ({
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
      }),
      execActions: () => ({ amount: -10000, subtransactions: [] }),
    });
    (isReflectBudget as jest.Mock).mockReturnValue(false);

    // When
    const result = await goalsSchedule(
      scheduleFlag,
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
    expect(result.scheduleFlag).toBe(true);
  });
});
