import * as db from '#server/db';
import { loadMappings } from '#server/db/mappings';
import { createSchedule } from '#server/schedules/app';
import { loadRules } from '#server/transactions/transaction-rules';
import type { Currency } from '#shared/currencies';
import * as monthUtils from '#shared/months';
import type { CategoryEntity } from '#types/models';

import { runScheduleForecast } from './schedule-template';

// Runs the forecast against a real database, so the transaction queries go
// through the real AQL compiler rather than a mock that interprets their
// filters itself.

vi.mock('#shared/months', async () => {
  const actualModule =
    await vi.importActual<typeof monthUtils>('#shared/months');
  return { ...actualModule, currentDay: vi.fn(actualModule.currentDay) };
});

const currency: Currency = {
  code: '',
  symbol: '',
  name: '',
  decimalPlaces: 2,
  numberFormat: 'comma-dot',
  symbolFirst: false,
};

beforeEach(async () => {
  await global.emptyDatabase()();
  await loadMappings();
  await loadRules();
});

afterEach(() => {
  vi.mocked(monthUtils.currentDay).mockReset();
});

async function setUpRent() {
  const account = await db.insertAccount({
    name: 'Checking',
    offbudget: 0,
    closed: 0,
  });
  const group = await db.insertCategoryGroup({ name: 'Bills' });
  const categoryId = await db.insertCategory({
    name: 'Rent',
    cat_group: group,
  });
  const category = { id: categoryId, name: 'Rent' } as CategoryEntity;
  const scheduleId = await createSchedule({
    schedule: { name: 'Rent' },
    conditions: [
      { op: 'is', field: 'account', value: account },
      { op: 'is', field: 'amount', value: -10000 },
      {
        op: 'is',
        field: 'date',
        value: {
          start: '2024-01-25',
          frequency: 'monthly',
          interval: 1,
          patterns: [],
          skipWeekend: false,
          weekendSolveMode: 'after',
          endMode: 'never',
        },
      },
    ],
  });
  const payRent = (date: string) =>
    db.insertTransaction({
      account,
      amount: -10000,
      date,
      category: categoryId,
      schedule: scheduleId,
    });
  const template = {
    type: 'schedule',
    name: 'Rent',
    scheduleId,
    priority: 0,
    directive: 'template',
  } as const;
  return { category, payRent, template };
}

describe('runScheduleForecast against a real database', () => {
  it('ignores payments dated after today when re-running a past month', async () => {
    // Sep 15, re-running June. June's rent posted in June; September's and
    // October's are already entered with future dates. Only June's belongs
    // to June's budget.
    vi.mocked(monthUtils.currentDay).mockReturnValue('2024-09-15');
    const { category, payRent, template } = await setUpRent();
    await payRent('2024-06-25');
    await payRent('2024-09-25');
    await payRent('2024-10-25');

    const result = await runScheduleForecast(
      [template],
      '2024-06',
      0,
      0,
      0,
      [],
      category,
      currency,
    );

    expect(result.to_budget).toBe(10000);
  });

  it('ignores future-dated payments when budgeting the current month', async () => {
    vi.mocked(monthUtils.currentDay).mockReturnValue('2024-09-15');
    const { category, payRent, template } = await setUpRent();
    await payRent('2024-09-25');
    await payRent('2024-10-25');

    const result = await runScheduleForecast(
      [template],
      '2024-09',
      0,
      0,
      0,
      [],
      category,
      currency,
    );

    expect(result.to_budget).toBe(10000);
  });
});
