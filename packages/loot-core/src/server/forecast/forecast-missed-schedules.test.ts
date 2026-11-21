import MockDate from 'mockdate';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import * as db from '#server/db';
import { loadMappings } from '#server/db/mappings';
import {
  createSchedule as createScheduleBase,
  skipNextDate,
} from '#server/schedules/app';
import { loadRules } from '#server/transactions/transaction-rules';
import type { RuleConditionEntity } from '#types/models';

import { generateForecast } from './app';
import type { ForecastRequestParams } from './app';

const { emptyDatabase } = global as typeof globalThis & {
  emptyDatabase: () => () => Promise<void>;
};
const createSchedule = createScheduleBase as (args: {
  conditions: RuleConditionEntity[];
}) => Promise<string>;

const TODAY = '2024-05-20';

async function createMonthlySchedule({
  account,
  amount,
  payee,
}: {
  account: string;
  amount: number;
  payee?: string;
}) {
  return createSchedule({
    conditions: [
      { op: 'is', field: 'account', value: account },
      ...(payee
        ? [{ op: 'is' as const, field: 'payee' as const, value: payee }]
        : []),
      { op: 'is', field: 'amount', value: amount },
      {
        op: 'is',
        field: 'date',
        value: { start: '2024-03-15', frequency: 'monthly' },
      },
    ] satisfies RuleConditionEntity[],
  });
}

async function forecast(params: Partial<ForecastRequestParams>) {
  const result = await generateForecast({
    startDate: '2024-05-01',
    endDate: '2024-06-30',
    ...params,
  });
  return {
    result,
    byAccountAndDate: new Map(
      result.dataPoints.map(dataPoint => [
        `${dataPoint.accountId}:${dataPoint.date}`,
        dataPoint,
      ]),
    ),
  };
}

beforeEach(async () => {
  await emptyDatabase()();
  await loadMappings();
  await loadRules();
  // Create schedules before their first due date, then let them go overdue.
  MockDate.set(new Date(2024, 2, 10, 12));
});

afterEach(() => {
  MockDate.reset();
});

describe('missed schedules in forecasts', () => {
  it('leaves overdue schedules out by default', async () => {
    const account = await db.insertAccount({ id: 'acct', name: 'Checking' });
    await createMonthlySchedule({ account, amount: -100 });
    MockDate.set(new Date(2024, 4, 20, 12));

    const defaultForecast = await forecast({ accountIds: [account] });
    const excluded = await forecast({
      accountIds: [account],
      missedSchedules: 'exclude',
      missedOccurrences: 'all',
    });

    expect(excluded.result).toEqual(defaultForecast.result);
    expect(defaultForecast.byAccountAndDate.get(`acct:${TODAY}`)).toMatchObject(
      { balance: 0, transactions: [] },
    );
    expect(
      defaultForecast.byAccountAndDate.get('acct:2024-06-15'),
    ).toMatchObject({ balance: -100, transactions: [{ amount: -100 }] });
  });

  it('settles one or every overdue occurrence today', async () => {
    const account = await db.insertAccount({ id: 'acct', name: 'Checking' });
    const scheduleId = await createMonthlySchedule({ account, amount: -100 });
    MockDate.set(new Date(2024, 4, 20, 12));

    const one = await forecast({
      accountIds: [account],
      missedSchedules: 'payments',
    });
    const all = await forecast({
      accountIds: [account],
      missedSchedules: 'payments',
      missedOccurrences: 'all',
    });

    expect(one.byAccountAndDate.get(`acct:${TODAY}`)).toEqual(
      expect.objectContaining({
        balance: -100,
        transactions: [
          expect.objectContaining({
            amount: -100,
            scheduleId,
            occurrenceDate: '2024-03-15',
            isMissed: true,
          }),
        ],
      }),
    );
    expect(
      all.byAccountAndDate
        .get(`acct:${TODAY}`)
        ?.transactions.map(transaction => transaction.occurrenceDate),
    ).toEqual(['2024-03-15', '2024-04-15', '2024-05-15']);
    expect(all.byAccountAndDate.get(`acct:${TODAY}`)?.balance).toBe(-300);
    // Upcoming occurrences keep their own dates.
    expect(all.byAccountAndDate.get('acct:2024-06-15')).toMatchObject({
      balance: -400,
      transactions: [{ amount: -100, occurrenceDate: '2024-06-15' }],
    });
    expect(
      all.byAccountAndDate.get('acct:2024-06-15')?.transactions[0].isMissed,
    ).toBeUndefined();
  });

  it('includes overdue income only when requested', async () => {
    const account = await db.insertAccount({ id: 'acct', name: 'Checking' });
    await createMonthlySchedule({ account, amount: 500 });
    MockDate.set(new Date(2024, 4, 20, 12));

    const payments = await forecast({
      accountIds: [account],
      missedSchedules: 'payments',
    });
    const all = await forecast({
      accountIds: [account],
      missedSchedules: 'all',
    });

    expect(payments.byAccountAndDate.get(`acct:${TODAY}`)?.balance).toBe(0);
    expect(all.byAccountAndDate.get(`acct:${TODAY}`)).toMatchObject({
      balance: 500,
      transactions: [{ amount: 500, isMissed: true }],
    });
  });

  it('settles both legs of an overdue transfer so they still net out', async () => {
    const checking = await db.insertAccount({
      id: 'checking',
      name: 'Checking',
    });
    const savings = await db.insertAccount({ id: 'savings', name: 'Savings' });
    const transferPayee = await db.insertPayee({
      id: 'transfer-payee',
      name: 'Transfer to savings',
      transfer_acct: savings,
    });
    await createMonthlySchedule({
      account: checking,
      amount: -250,
      payee: transferPayee,
    });
    MockDate.set(new Date(2024, 4, 20, 12));

    const combined = await forecast({
      accountIds: [checking, savings],
      missedSchedules: 'payments',
    });
    // A transfer into the only selected account is not income.
    const savingsOnly = await forecast({
      accountIds: [savings],
      missedSchedules: 'payments',
    });

    expect(combined.byAccountAndDate.get(`checking:${TODAY}`)).toMatchObject({
      balance: -250,
      transactions: [{ amount: -250, isMissed: true, isTransfer: true }],
    });
    expect(combined.byAccountAndDate.get(`savings:${TODAY}`)).toMatchObject({
      balance: 250,
      transactions: [{ amount: 250, isMissed: true, isTransfer: true }],
    });
    expect(savingsOnly.byAccountAndDate.get(`savings:${TODAY}`)?.balance).toBe(
      250,
    );
  });

  it('does not reconstruct occurrences a schedule has already moved past', async () => {
    const paidAccount = await db.insertAccount({ id: 'paid', name: 'Paid' });
    const paidScheduleId = await createMonthlySchedule({
      account: paidAccount,
      amount: -100,
    });
    const skippedAccount = await db.insertAccount({
      id: 'skipped',
      name: 'Skipped',
    });
    const skippedScheduleId = await createMonthlySchedule({
      account: skippedAccount,
      amount: -100,
    });
    MockDate.set(new Date(2024, 4, 20, 12));
    // A late linked payment marks the schedule paid until it moves forward.
    await db.insertTransaction({
      id: 'late-payment',
      account: paidAccount,
      amount: -100,
      date: '2024-04-02',
      schedule: paidScheduleId,
    });
    await skipNextDate({ id: skippedScheduleId });

    const { byAccountAndDate } = await forecast({
      accountIds: [paidAccount, skippedAccount],
      missedSchedules: 'all',
      missedOccurrences: 'all',
    });

    expect(byAccountAndDate.get(`paid:${TODAY}`)).toMatchObject({
      balance: -100,
      transactions: [],
    });
    expect(
      byAccountAndDate
        .get(`skipped:${TODAY}`)
        ?.transactions.map(transaction => transaction.occurrenceDate),
    ).toEqual(['2024-04-15', '2024-05-15']);
  });

  it('reports when the range cannot settle missed schedules today', async () => {
    const account = await db.insertAccount({ id: 'acct', name: 'Checking' });
    await createMonthlySchedule({ account, amount: -100 });
    MockDate.set(new Date(2024, 4, 20, 12));

    for (const range of [
      { startDate: '2024-03-01', endDate: '2024-04-30' },
      { startDate: '2024-06-01', endDate: '2024-07-31' },
    ]) {
      const excluded = await forecast({ accountIds: [account], ...range });
      const requested = await forecast({
        accountIds: [account],
        missedSchedules: 'all',
        missedOccurrences: 'all',
        ...range,
      });

      expect(requested.result).toEqual({
        ...excluded.result,
        missedSchedulesUnsupported: 'today-outside-range',
      });
    }
  });
});
