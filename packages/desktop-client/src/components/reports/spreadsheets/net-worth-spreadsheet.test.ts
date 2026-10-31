import {
  clearServer,
  initServer,
} from '@actual-app/core/platform/client/connection';
import type { AccountEntity } from '@actual-app/core/types/models';
import { enUS } from 'date-fns/locale';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { AccountBalanceConverter } from '#hooks/useAccountBalanceConverter';

import { createSpreadsheet } from './net-worth-spreadsheet';

vi.mock(
  '@actual-app/core/platform/client/connection',
  () => import('#mocks/connection'),
);

type SpreadsheetData = Parameters<
  Parameters<ReturnType<typeof createSpreadsheet>>[1]
>[0];

type LinkedTransfer = {
  id: string;
  account: string;
  amount: number;
  date: string;
  transfer_id: string;
};

type AccountQueryResult = number | Array<{ date: string; amount: number }>;

const accounts = [
  createAccount('checking', 'Checking'),
  createAccount('savings', 'Savings'),
] satisfies AccountEntity[];

function createAccount(id: string, name: string): AccountEntity {
  return {
    id,
    name,
    offbudget: 0,
    closed: 0,
    sort_order: 0,
    last_reconciled: null,
    tombstone: 0,
    account_group_id: null,
    currency: null,
    account_id: null,
    bank: null,
    bankName: null,
    bankId: null,
    mask: null,
    official_name: null,
    balance_current: null,
    balance_available: null,
    balance_limit: null,
    account_sync_source: null,
    last_sync: null,
    bank_sync_status: null,
  };
}

async function runReport({
  accounts,
  accountQueryResults,
  linkedTransfers = [],
  start = '2026-07',
  end = '2026-08',
  interval = 'Monthly',
  earliestTransactionDate = '2026-07-01',
  convertBalance,
  defaultCurrencyCode,
}: {
  accounts: AccountEntity[];
  accountQueryResults: AccountQueryResult[];
  linkedTransfers?: LinkedTransfer[];
  start?: string;
  end?: string;
  interval?: string;
  earliestTransactionDate?: string;
  convertBalance?: AccountBalanceConverter;
  defaultCurrencyCode?: string;
}) {
  const remainingAccountResults = [...accountQueryResults];

  initServer({
    'make-filters-from-conditions': async () => ({ filters: [] }),
    'get-earliest-transaction': async () => ({
      date: earliestTransactionDate,
    }),
    query: async query => {
      if (query.selectExpressions.includes('transfer_id')) {
        const transferFilter = query.filterExpressions.find(
          expression => 'transfer_id' in expression,
        );
        const accountIds = getOneOfValues(transferFilter?.account);
        const transactionIds = getOneOfValues(transferFilter?.id);
        const endDate = getUpperBound(transferFilter?.date);

        return {
          data: linkedTransfers.filter(
            leg =>
              (accountIds.length === 0 || accountIds.includes(leg.account)) &&
              (transactionIds.length === 0 ||
                transactionIds.includes(leg.id)) &&
              (!endDate || leg.date <= endDate),
          ),
          dependencies: [],
        };
      }

      const data = remainingAccountResults.shift();
      if (data === undefined) {
        throw new Error('Unexpected account query');
      }
      return { data, dependencies: [] };
    },
  });

  let report: SpreadsheetData | undefined;
  const spreadsheet = createSpreadsheet(
    start,
    end,
    accounts,
    [],
    'and',
    enUS,
    interval,
    '0',
    value => String(value),
    undefined,
    { convertBalance, defaultCurrencyCode },
  );

  // The net worth factory does not use its spreadsheet dependency.
  await spreadsheet(undefined as never, data => {
    report = data;
  });

  if (!report) {
    throw new Error('Spreadsheet did not produce report data');
  }
  return report;
}

function getOneOfValues(value: unknown) {
  if (
    typeof value === 'object' &&
    value !== null &&
    '$oneof' in value &&
    Array.isArray(value.$oneof)
  ) {
    return value.$oneof.filter(item => typeof item === 'string');
  }
  return [];
}

function getUpperBound(value: unknown) {
  if (
    typeof value === 'object' &&
    value !== null &&
    '$lte' in value &&
    typeof value.$lte === 'string'
  ) {
    return value.$lte;
  }
  return null;
}

afterEach(async () => {
  await clearServer();
});

describe('net worth transfers', () => {
  it('keeps a linked transfer neutral when its two legs cross months', async () => {
    const report = await runReport({
      accounts,
      accountQueryResults: [
        100_000,
        [{ date: '2026-07', amount: -10_000 }],
        0,
        [{ date: '2026-08', amount: 10_000 }],
      ],
      linkedTransfers: [
        {
          id: 'checking-transfer',
          account: 'checking',
          amount: -10_000,
          date: '2026-07-31',
          transfer_id: 'savings-transfer',
        },
        {
          id: 'savings-transfer',
          account: 'savings',
          amount: 10_000,
          date: '2026-08-01',
          transfer_id: 'checking-transfer',
        },
      ],
    });

    expect(report.graphData.data.map(point => point.y)).toEqual([
      100_000, 100_000,
    ]);
  });

  it('preserves a real expense as a net worth loss', async () => {
    const report = await runReport({
      accounts: [accounts[0]],
      accountQueryResults: [100_000, [{ date: '2026-07', amount: -10_000 }]],
    });

    expect(report.graphData.data.map(point => point.y)).toEqual([
      90_000, 90_000,
    ]);
  });

  it('preserves a transfer out of the selected account set as a loss', async () => {
    const report = await runReport({
      accounts: [accounts[0]],
      accountQueryResults: [100_000, [{ date: '2026-07', amount: -10_000 }]],
      linkedTransfers: [
        {
          id: 'checking-transfer',
          account: 'checking',
          amount: -10_000,
          date: '2026-07-31',
          transfer_id: 'savings-transfer',
        },
        {
          id: 'savings-transfer',
          account: 'savings',
          amount: 10_000,
          date: '2026-08-01',
          transfer_id: 'checking-transfer',
        },
      ],
    });

    expect(report.graphData.data.map(point => point.y)).toEqual([
      90_000, 90_000,
    ]);
  });

  it('keeps funds in the source account until a later counterpart arrives', async () => {
    const report = await runReport({
      accounts,
      accountQueryResults: [
        100_000,
        [{ date: '2026-08', amount: -10_000 }],
        0,
        [],
      ],
      linkedTransfers: [
        {
          id: 'checking-transfer',
          account: 'checking',
          amount: -10_000,
          date: '2026-08-31',
          transfer_id: 'savings-transfer',
        },
        {
          id: 'savings-transfer',
          account: 'savings',
          amount: 10_000,
          date: '2026-09-01',
          transfer_id: 'checking-transfer',
        },
      ],
    });

    expect(report.graphData.data.map(point => point.y)).toEqual([
      100_000, 100_000,
    ]);
    expect(report.graphData.data.at(-1)).toMatchObject({ checking: 100_000 });
  });

  it('keeps a transfer neutral when it spans the entire report range', async () => {
    const report = await runReport({
      accounts,
      accountQueryResults: [90_000, [], 0, []],
      linkedTransfers: [
        {
          id: 'checking-transfer',
          account: 'checking',
          amount: -10_000,
          date: '2026-06-30',
          transfer_id: 'savings-transfer',
        },
        {
          id: 'savings-transfer',
          account: 'savings',
          amount: 10_000,
          date: '2026-09-01',
          transfer_id: 'checking-transfer',
        },
      ],
      start: '2026-08',
      end: '2026-08',
      earliestTransactionDate: '2026-06-30',
    });

    expect(report.graphData.data.map(point => point.y)).toEqual([
      100_000, 100_000,
    ]);
  });

  it.each([
    {
      interval: 'Daily',
      start: '2016-07',
      end: '2016-07',
      earliestTransactionDate: '2016-07-30',
      earlierDate: '2016-07-30',
      laterDate: '2016-07-31',
      earlierBalanceDate: '2016-07-30',
      laterBalanceDate: '2016-07-31',
    },
    {
      interval: 'Weekly',
      start: '2016-07',
      end: '2016-07',
      earliestTransactionDate: '2016-07-30',
      earlierDate: '2016-07-30',
      laterDate: '2016-07-31',
      earlierBalanceDate: '2016-07-30',
      laterBalanceDate: '2016-07-31',
    },
    {
      interval: 'Yearly',
      start: '2016-01',
      end: '2017-01',
      earliestTransactionDate: '2016-12-31',
      earlierDate: '2016-12-31',
      laterDate: '2017-01-01',
      earlierBalanceDate: '2016',
      laterBalanceDate: '2017',
    },
  ])(
    'keeps a linked transfer neutral across $interval intervals',
    async ({
      interval,
      start,
      end,
      earliestTransactionDate,
      earlierDate,
      laterDate,
      earlierBalanceDate,
      laterBalanceDate,
    }) => {
      const report = await runReport({
        accounts,
        accountQueryResults: [
          100_000,
          [{ date: earlierBalanceDate, amount: -10_000 }],
          0,
          [{ date: laterBalanceDate, amount: 10_000 }],
        ],
        linkedTransfers: [
          {
            id: 'checking-transfer',
            account: 'checking',
            amount: -10_000,
            date: earlierDate,
            transfer_id: 'savings-transfer',
          },
          {
            id: 'savings-transfer',
            account: 'savings',
            amount: 10_000,
            date: laterDate,
            transfer_id: 'checking-transfer',
          },
        ],
        start,
        end,
        interval,
        earliestTransactionDate,
      });

      const totals = report.graphData.data.map(point => point.y);
      expect(totals).toEqual(totals.map(() => 100_000));
    },
  );
});

describe('net worth in multiple currencies', () => {
  it('values each balance on the last day of its interval', async () => {
    // USD savings: worth 1.30 CAD in July and 1.40 CAD in August
    const rates: Record<string, number> = {
      'savings@2026-07-31': 1.3,
      'savings@2026-08-31': 1.4,
    };
    const convertBalance = vi.fn<AccountBalanceConverter>(
      (amount, accountId, date) => ({
        amount: Math.round(amount * (rates[`${accountId}@${date}`] ?? 1)),
        isApproximate: false,
      }),
    );

    const report = await runReport({
      accounts,
      accountQueryResults: [100_000, [], 10_000, []],
      convertBalance,
    });

    // The USD balance didn't change, but its CAD value did
    expect(report.graphData.data.map(point => point.y)).toEqual([
      100_000 + 13_000,
      100_000 + 14_000,
    ]);
    expect(convertBalance).toHaveBeenCalledWith(
      10_000,
      'savings',
      '2026-07-31',
    );
    expect(convertBalance).toHaveBeenCalledWith(
      10_000,
      'savings',
      '2026-08-31',
    );
    expect(report.hasApproximateConversion).toBe(false);
  });

  it('keeps a transfer between currencies neutral across months', async () => {
    // CA$140.00 left on July 31 and USD$100.00 arrived on August 1, at
    // 1.40 CAD per USD
    const convertBalance: AccountBalanceConverter = (amount, accountId) => ({
      amount: accountId === 'savings' ? Math.round(amount * 1.4) : amount,
      isApproximate: false,
    });

    const report = await runReport({
      accounts: [accounts[0], { ...accounts[1], currency: 'USD' }],
      accountQueryResults: [
        100_000,
        [{ date: '2026-07', amount: -14_000 }],
        0,
        [{ date: '2026-08', amount: 10_000 }],
      ],
      linkedTransfers: [
        {
          id: 'checking-transfer',
          account: 'checking',
          amount: -14_000,
          date: '2026-07-31',
          transfer_id: 'savings-transfer',
        },
        {
          id: 'savings-transfer',
          account: 'savings',
          amount: 10_000,
          date: '2026-08-01',
          transfer_id: 'checking-transfer',
        },
      ],
      convertBalance,
      defaultCurrencyCode: 'CAD',
    });

    expect(report.graphData.data.map(point => point.y)).toEqual([
      100_000, 100_000,
    ]);
  });

  it('pairs legs by amount for an account set to the default currency', async () => {
    // Both accounts are in CAD, so legs of different amounts aren't the
    // two sides of one transfer
    const report = await runReport({
      accounts: [accounts[0], { ...accounts[1], currency: 'CAD' }],
      accountQueryResults: [
        100_000,
        [{ date: '2026-07', amount: -10_000 }],
        0,
        [{ date: '2026-08', amount: 9_000 }],
      ],
      linkedTransfers: [
        {
          id: 'checking-transfer',
          account: 'checking',
          amount: -10_000,
          date: '2026-07-31',
          transfer_id: 'savings-transfer',
        },
        {
          id: 'savings-transfer',
          account: 'savings',
          amount: 9_000,
          date: '2026-08-01',
          transfer_id: 'checking-transfer',
        },
      ],
      convertBalance: amount => ({ amount, isApproximate: false }),
      defaultCurrencyCode: 'CAD',
    });

    expect(report.graphData.data.map(point => point.y)).toEqual([
      90_000, 99_000,
    ]);
  });

  it('computes nothing while the exchange rates are loading', async () => {
    const setData = vi.fn();
    const spreadsheet = createSpreadsheet(
      '2026-07',
      '2026-08',
      accounts,
      [],
      'and',
      enUS,
      'Monthly',
      '0',
      value => String(value),
      undefined,
      { convertBalance: null },
    );

    await spreadsheet(undefined as never, setData);

    expect(setData).not.toHaveBeenCalled();
  });

  it('reports balances converted approximately', async () => {
    const report = await runReport({
      accounts,
      accountQueryResults: [100_000, [], 10_000, []],
      convertBalance: (amount, accountId) => ({
        amount,
        isApproximate: accountId === 'savings',
      }),
    });

    expect(report.hasApproximateConversion).toBe(true);
  });

  it('does not report a zero balance as converted approximately', async () => {
    const report = await runReport({
      accounts,
      // Savings has no balance yet, e.g. before the first exchange rate
      accountQueryResults: [100_000, [], 0, []],
      convertBalance: (amount, accountId) => ({
        amount,
        isApproximate: accountId === 'savings',
      }),
    });

    expect(report.hasApproximateConversion).toBe(false);
  });
});
