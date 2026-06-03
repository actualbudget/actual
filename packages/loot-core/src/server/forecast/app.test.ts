import MockDate from 'mockdate';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import * as db from '#server/db';
import { loadMappings } from '#server/db/mappings';
import {
  createSchedule as createScheduleBase,
  getRuleForSchedule,
} from '#server/schedules/app';
import { loadRules, updateRule } from '#server/transactions/transaction-rules';
import type { RuleConditionEntity } from '#types/models';

import { generateForecast } from './app';
import { FORECAST_UNASSIGNED_ACCOUNT_ID } from './forecast-schedules';

const { emptyDatabase } = global as typeof globalThis & {
  emptyDatabase: () => () => Promise<void>;
};
const createSchedule = createScheduleBase as (args: {
  conditions: RuleConditionEntity[];
}) => Promise<string>;

async function createForecastWithPostedMonthlySchedule({
  txId,
  txDate,
}: {
  txId: string;
  txDate: string;
}) {
  const accountId = await db.insertAccount({ id: 'acct', name: 'Checking' });
  const salaryAmount = 500_000;

  const scheduleId = await createSchedule({
    conditions: [
      { op: 'is', field: 'account', value: accountId },
      { op: 'is', field: 'amount', value: salaryAmount },
      {
        op: 'is',
        field: 'date',
        value: {
          start: '2024-03-10',
          frequency: 'monthly',
        },
      },
    ] satisfies RuleConditionEntity[],
  });

  await db.insertTransaction({
    id: txId,
    account: accountId,
    amount: salaryAmount,
    date: txDate,
    schedule: scheduleId,
  });

  const result = await generateForecast({
    accountIds: [accountId],
    startDate: '2024-03-01',
    endDate: '2024-04-30',
  });

  return {
    salaryAmount,
    balanceByDate: Object.fromEntries(
      result.dataPoints.map(({ date, balance }) => [date, balance]),
    ),
    dataPointByDate: Object.fromEntries(
      result.dataPoints.map(dataPoint => [dataPoint.date, dataPoint]),
    ),
  };
}

beforeEach(async () => {
  await emptyDatabase()();
  await loadMappings();
  await loadRules();
  MockDate.set(new Date(2024, 2, 10, 12));
});

afterEach(() => {
  MockDate.reset();
});

describe('forecast app', () => {
  it('shows the real running balance for historical months', async () => {
    const accountId = await db.insertAccount({ id: 'acct', name: 'Checking' });

    await db.insertTransaction({
      id: 'starting-deposit',
      account: accountId,
      amount: 1000,
      date: '2024-01-05',
    });
    await db.insertTransaction({
      id: 'march-spend',
      account: accountId,
      amount: -200,
      date: '2024-03-20',
    });

    const result = await generateForecast({
      accountIds: [accountId],
      startDate: '2024-01-01',
      endDate: '2024-04-30',
    });

    const balanceByDate = Object.fromEntries(
      result.dataPoints.map(({ date, balance }) => [date, balance]),
    );

    expect(balanceByDate['2024-01-01']).toBe(0);
    expect(balanceByDate['2024-01-05']).toBe(1000);
    expect(balanceByDate['2024-03-19']).toBe(1000);
    expect(balanceByDate['2024-03-20']).toBe(800);
    expect(balanceByDate['2024-04-30']).toBe(800);
    expect(result.dataPoints).toHaveLength(121);
    expect(result.lowestBalance).toEqual({
      date: '2024-01-01',
      balance: 0,
      accountId: '',
      accountName: '',
    });
  });

  it('treats an explicit empty account selection as no accounts', async () => {
    const accountId = await db.insertAccount({ id: 'acct', name: 'Checking' });

    await db.insertTransaction({
      id: 'starting-deposit',
      account: accountId,
      amount: 1000,
      date: '2024-01-05',
    });

    const result = await generateForecast({
      accountIds: [],
      startDate: '2024-01-01',
      endDate: '2024-01-31',
    });

    expect(result.dataPoints).toEqual([]);
    expect(result.lowestBalance).toEqual({
      date: '2024-01-01',
      balance: 0,
      accountId: '',
      accountName: '',
    });
  });

  it('ignores reconstructed schedule occurrences before today', async () => {
    const accountId = await db.insertAccount({ id: 'acct', name: 'Checking' });
    const scheduleConditions = [
      { op: 'is', field: 'account', value: accountId },
      { op: 'is', field: 'amount', value: -100 },
      {
        op: 'is',
        field: 'date',
        value: {
          start: '2024-01-15',
          frequency: 'monthly',
        },
      },
    ] satisfies RuleConditionEntity[];

    await createSchedule({ conditions: scheduleConditions });

    const result = await generateForecast({
      accountIds: [accountId],
      startDate: '2024-01-01',
      endDate: '2024-04-30',
    });

    const dataPointByDate = Object.fromEntries(
      result.dataPoints.map(dataPoint => [dataPoint.date, dataPoint]),
    );

    expect(dataPointByDate['2024-03-14']).toMatchObject({
      balance: 0,
      transactions: [],
    });
    expect(dataPointByDate['2024-03-15']).toMatchObject({
      balance: -100,
      transactions: [{ amount: -100 }],
    });
    expect(dataPointByDate['2024-04-14']).toMatchObject({
      balance: -100,
      transactions: [],
    });
    expect(dataPointByDate['2024-04-15']).toMatchObject({
      balance: -200,
      transactions: [{ amount: -100 }],
    });
  });

  it('forecasts transfer schedules for both source and destination accounts', async () => {
    const checkingId = await db.insertAccount({
      id: 'checking',
      name: 'Checking',
    });
    const savingsId = await db.insertAccount({
      id: 'savings',
      name: 'Savings',
    });
    const transferPayeeId = await db.insertPayee({
      id: 'transfer-payee',
      name: 'Transfer to savings',
      transfer_acct: savingsId,
    });

    await createSchedule({
      conditions: [
        { op: 'is', field: 'account', value: checkingId },
        { op: 'is', field: 'payee', value: transferPayeeId },
        { op: 'is', field: 'amount', value: -250 },
        {
          op: 'is',
          field: 'date',
          value: {
            start: '2024-03-20',
            frequency: 'monthly',
          },
        },
      ] satisfies RuleConditionEntity[],
    });

    const combinedResult = await generateForecast({
      accountIds: [checkingId, savingsId],
      startDate: '2024-03-01',
      endDate: '2024-04-30',
    });
    const savingsOnlyResult = await generateForecast({
      accountIds: [savingsId],
      startDate: '2024-03-01',
      endDate: '2024-04-30',
    });

    const combinedDataPointByAccountAndDate = new Map(
      combinedResult.dataPoints.map(dataPoint => [
        `${dataPoint.accountId}:${dataPoint.date}`,
        dataPoint,
      ]),
    );
    const savingsOnlyDataPointByDate = Object.fromEntries(
      savingsOnlyResult.dataPoints.map(dataPoint => [
        dataPoint.date,
        dataPoint,
      ]),
    );

    expect(
      combinedDataPointByAccountAndDate.get('checking:2024-03-20'),
    ).toMatchObject({
      balance: -250,
      transactions: [{ amount: -250, scheduleId: expect.any(String) }],
    });
    expect(
      combinedDataPointByAccountAndDate.get('savings:2024-03-20'),
    ).toMatchObject({
      balance: 250,
      transactions: [{ amount: 250, scheduleId: expect.any(String) }],
    });
    expect(combinedResult.lowestBalance.balance).toBe(0);
    expect(savingsOnlyDataPointByDate['2024-03-20']).toMatchObject({
      balance: 250,
      transactions: [{ amount: 250, scheduleId: expect.any(String) }],
    });
    expect(
      combinedResult.dataPoints.every(dataPoint =>
        [checkingId, savingsId].includes(dataPoint.accountId),
      ),
    ).toBe(true);
    expect(
      savingsOnlyResult.dataPoints.every(
        dataPoint => dataPoint.accountId === savingsId,
      ),
    ).toBe(true);
  });

  it('matches payee filters for destination-only transfer forecasts', async () => {
    const checkingId = await db.insertAccount({
      id: 'checking',
      name: 'Checking',
    });
    const savingsId = await db.insertAccount({
      id: 'savings',
      name: 'Savings',
    });
    const transferToSavingsPayeeId = await db.insertPayee({
      id: 'transfer-to-savings',
      name: 'Transfer to savings',
      transfer_acct: savingsId,
    });
    const transferToCheckingPayeeId = await db.insertPayee({
      id: 'transfer-to-checking',
      name: 'Transfer to checking',
      transfer_acct: checkingId,
    });

    await createSchedule({
      conditions: [
        { op: 'is', field: 'account', value: checkingId },
        { op: 'is', field: 'payee', value: transferToSavingsPayeeId },
        { op: 'is', field: 'amount', value: -250 },
        {
          op: 'is',
          field: 'date',
          value: {
            start: '2024-03-20',
            frequency: 'monthly',
          },
        },
      ] satisfies RuleConditionEntity[],
    });

    const result = await generateForecast({
      accountIds: [savingsId],
      startDate: '2024-03-01',
      endDate: '2024-04-30',
      conditions: [
        { op: 'is', field: 'payee', value: transferToCheckingPayeeId },
      ],
    });

    const dataPointByDate = Object.fromEntries(
      result.dataPoints.map(dataPoint => [dataPoint.date, dataPoint]),
    );

    expect(dataPointByDate['2024-03-20']).toMatchObject({
      accountId: savingsId,
      balance: 250,
      transactions: [
        {
          amount: 250,
          payee: 'Checking',
          scheduleId: expect.any(String),
        },
      ],
    });
    expect(dataPointByDate['2024-04-20']).toMatchObject({
      accountId: savingsId,
      balance: 500,
      transactions: [
        {
          amount: 250,
          payee: 'Checking',
          scheduleId: expect.any(String),
        },
      ],
    });
  });

  it('applies standard historical report filters to posted transactions', async () => {
    const accountId = await db.insertAccount({ id: 'acct', name: 'Checking' });
    const groceryPayeeId = await db.insertPayee({
      id: 'payee-grocery',
      name: 'Grocery Store',
    });
    const rentPayeeId = await db.insertPayee({
      id: 'payee-rent',
      name: 'Landlord',
    });

    await db.insertTransaction({
      id: 'grocery',
      account: accountId,
      payee: groceryPayeeId,
      amount: -25,
      date: '2024-03-10',
    });
    await db.insertTransaction({
      id: 'rent',
      account: accountId,
      payee: rentPayeeId,
      amount: -100,
      date: '2024-03-11',
    });

    const result = await generateForecast({
      startDate: '2024-03-01',
      endDate: '2024-03-31',
      conditions: [{ op: 'is', field: 'payee', value: groceryPayeeId }],
    });

    const balanceByDate = Object.fromEntries(
      result.dataPoints.map(({ date, balance }) => [date, balance]),
    );

    expect(balanceByDate['2024-03-09']).toBe(0);
    expect(balanceByDate['2024-03-10']).toBe(-25);
    expect(balanceByDate['2024-03-11']).toBe(-25);
    expect(balanceByDate['2024-03-31']).toBe(-25);
  });

  it('does not double-count split parents in posted transaction balances', async () => {
    const accountId = await db.insertAccount({ id: 'acct', name: 'Checking' });

    const parentId = await db.insertTransaction({
      id: 'split-parent',
      account: accountId,
      amount: 100,
      date: '2024-03-10',
      is_parent: true,
      category: null,
    });

    await db.insertTransaction({
      id: 'split-child-1',
      account: accountId,
      amount: 60,
      date: '2024-03-10',
      is_child: true,
      parent_id: parentId,
    });
    await db.insertTransaction({
      id: 'split-child-2',
      account: accountId,
      amount: 40,
      date: '2024-03-10',
      is_child: true,
      parent_id: parentId,
    });

    const result = await generateForecast({
      accountIds: [accountId],
      startDate: '2024-03-01',
      endDate: '2024-03-31',
    });

    const balanceByDate = Object.fromEntries(
      result.dataPoints.map(({ date, balance }) => [date, balance]),
    );

    expect(balanceByDate['2024-03-09']).toBe(0);
    expect(balanceByDate['2024-03-10']).toBe(100);
    expect(balanceByDate['2024-03-31']).toBe(100);
  });

  it('does not double-count schedule occurrences already posted on the due date', async () => {
    const { salaryAmount, balanceByDate, dataPointByDate } =
      await createForecastWithPostedMonthlySchedule({
        txId: 'posted-salary',
        txDate: '2024-03-10',
      });

    expect(balanceByDate['2024-03-09']).toBe(0);
    expect(balanceByDate['2024-03-10']).toBe(salaryAmount);
    expect(balanceByDate['2024-04-09']).toBe(salaryAmount);
    expect(balanceByDate['2024-04-10']).toBe(salaryAmount * 2);
    expect(dataPointByDate['2024-03-10'].transactions).toEqual([]);
  });

  it('does not double-count schedule occurrences posted early within the lookback window', async () => {
    const { salaryAmount, balanceByDate } =
      await createForecastWithPostedMonthlySchedule({
        txId: 'posted-salary-early',
        txDate: '2024-03-09',
      });

    expect(balanceByDate['2024-03-08']).toBe(0);
    expect(balanceByDate['2024-03-09']).toBe(salaryAmount);
    expect(balanceByDate['2024-03-10']).toBe(salaryAmount);
    expect(balanceByDate['2024-04-10']).toBe(salaryAmount * 2);
  });

  it('filters future schedule occurrences using rule-derived fields like category', async () => {
    const accountId = await db.insertAccount({ id: 'acct', name: 'Checking' });
    const groupId = await db.insertCategoryGroup({ name: 'Bills' });
    const categoryId = await db.insertCategory({
      name: 'Utilities',
      cat_group: groupId,
    });

    const scheduleId = await createSchedule({
      conditions: [
        { op: 'is', field: 'account', value: accountId },
        { op: 'is', field: 'amount', value: -75 },
        {
          op: 'is',
          field: 'date',
          value: {
            start: '2024-03-15',
            frequency: 'monthly',
          },
        },
      ] satisfies RuleConditionEntity[],
    });

    const scheduleRule = await getRuleForSchedule(scheduleId);
    await updateRule({
      ...scheduleRule.serialize(),
      actions: [
        { op: 'link-schedule', value: scheduleId },
        { op: 'set', field: 'category', value: categoryId },
      ],
    });
    await loadRules();

    const result = await generateForecast({
      startDate: '2024-03-01',
      endDate: '2024-04-30',
      conditions: [{ op: 'is', field: 'category', value: categoryId }],
    });

    const dataPointByDate = Object.fromEntries(
      result.dataPoints.map(dataPoint => [dataPoint.date, dataPoint]),
    );

    expect(dataPointByDate['2024-03-15']).toMatchObject({
      balance: -75,
      transactions: [{ amount: -75, scheduleId }],
    });
    expect(dataPointByDate['2024-04-15']).toMatchObject({
      balance: -150,
      transactions: [{ amount: -75, scheduleId }],
    });
  });

  it('does not over-restrict accounts when filters use mixed OR conditions', async () => {
    const checkingId = await db.insertAccount({
      id: 'checking',
      name: 'Checking',
    });
    const savingsId = await db.insertAccount({
      id: 'savings',
      name: 'Savings',
    });
    const groceryPayeeId = await db.insertPayee({
      id: 'payee-grocery',
      name: 'Grocery Store',
    });
    const salaryPayeeId = await db.insertPayee({
      id: 'payee-salary',
      name: 'Employer',
    });

    await db.insertTransaction({
      id: 'checking-grocery',
      account: checkingId,
      payee: groceryPayeeId,
      amount: -30,
      date: '2024-03-10',
    });
    await db.insertTransaction({
      id: 'savings-salary',
      account: savingsId,
      payee: salaryPayeeId,
      amount: 200,
      date: '2024-03-11',
    });

    const result = await generateForecast({
      startDate: '2024-03-01',
      endDate: '2024-03-31',
      conditionsOp: 'or',
      conditions: [
        { op: 'is', field: 'account', value: savingsId },
        { op: 'is', field: 'payee', value: groceryPayeeId },
      ],
    });

    const balanceByAccountAndDate = new Map(
      result.dataPoints.map(dataPoint => [
        `${dataPoint.accountId}:${dataPoint.date}`,
        dataPoint.balance,
      ]),
    );

    expect(balanceByAccountAndDate.get('checking:2024-03-10')).toBe(-30);
    expect(balanceByAccountAndDate.get('savings:2024-03-11')).toBe(200);
  });

  it('uses the requested range for empty-account results', async () => {
    const result = await generateForecast({
      accountIds: ['missing-account'],
      startDate: '2024-03-01',
      endDate: '2024-03-31',
    });

    expect(result).toEqual({
      dataPoints: [],
      lowestBalance: {
        date: '2024-03-01',
        balance: 0,
        accountId: '',
        accountName: '',
      },
      forecastStartDate: '2024-03-01',
      forecastEndDate: '2024-03-31',
    });
  });

  it('includes account-less schedules when includeAccountlessSchedules is true', async () => {
    const accountId = await db.insertAccount({ id: 'acct', name: 'Checking' });

    await createSchedule({
      conditions: [
        { op: 'is', field: 'amount', value: -75 },
        {
          op: 'is',
          field: 'date',
          value: {
            start: '2024-03-15',
            frequency: 'monthly',
          },
        },
      ] satisfies RuleConditionEntity[],
    });

    const result = await generateForecast({
      accountIds: [accountId],
      startDate: '2024-03-01',
      endDate: '2024-03-31',
      includeAccountlessSchedules: true,
    });

    const combinedBalance = (date: string) =>
      result.dataPoints
        .filter(dataPoint => dataPoint.date === date)
        .reduce((sum, dataPoint) => sum + dataPoint.balance, 0);

    expect(combinedBalance('2024-03-15')).toBe(-75);
    expect(result.lowestBalance).toMatchObject({
      date: '2024-03-15',
      balance: -75,
    });
    expect(
      result.dataPoints.some(
        dataPoint => dataPoint.accountId === FORECAST_UNASSIGNED_ACCOUNT_ID,
      ),
    ).toBe(true);
  });

  it('excludes account-less schedules when includeAccountlessSchedules is false', async () => {
    const accountId = await db.insertAccount({ id: 'acct', name: 'Checking' });

    await createSchedule({
      conditions: [
        { op: 'is', field: 'amount', value: -75 },
        {
          op: 'is',
          field: 'date',
          value: {
            start: '2024-03-15',
            frequency: 'monthly',
          },
        },
      ] satisfies RuleConditionEntity[],
    });

    const result = await generateForecast({
      accountIds: [accountId],
      startDate: '2024-03-01',
      endDate: '2024-03-31',
      includeAccountlessSchedules: false,
    });

    const combinedBalance = (date: string) =>
      result.dataPoints
        .filter(dataPoint => dataPoint.date === date)
        .reduce((sum, dataPoint) => sum + dataPoint.balance, 0);

    expect(combinedBalance('2024-03-15')).toBe(0);
    expect(
      result.dataPoints.every(
        dataPoint => dataPoint.accountId !== FORECAST_UNASSIGNED_ACCOUNT_ID,
      ),
    ).toBe(true);
  });
});
