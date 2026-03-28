import { format } from 'date-fns';

import { aqlQuery } from '#server/aql';
import * as db from '#server/db';
import { runRules } from '#server/transactions/transaction-rules';
import * as monthUtils from '#shared/months';
import { q } from '#shared/query';
import {
  extractScheduleConds,
  getNextDate,
  getScheduledAmount,
} from '#shared/schedules';
import type { RuleConditionEntity, TransactionEntity } from '#types/models';
import type { RecurConfig } from '#types/models/schedule';

import type {
  AccountWithComputedBalance,
  DbAccountForRules,
} from './forecast-accounts';
import { enrichForecastFilterObjects } from './forecast-filters';
import type { ForecastFilterObject } from './forecast-filters';

type ScheduleDataBase = {
  id: string;
  name: string | null;
  next_date: string;
  rule?: string | null;
  _payee: string | null;
  _account: string;
  _amount: number;
};

export type ScheduleData =
  | (ScheduleDataBase & { _date: string })
  | (ScheduleDataBase & { _date: RecurConfig });

type RawScheduleData = {
  id: string;
  name: string | null;
  next_date: string;
  rule?: string | null;
  _payee?: string | null;
  _account?: string | null;
  _amount?: number | { num1: number; num2: number } | null;
  _date?: string | RecurConfig | null;
  _conditions?: RuleConditionEntity[];
};

type TransferPayee = {
  id: string;
  name: string;
  transfer_acct: string | null;
};

export type ForecastScheduleOccurrence = {
  transaction: TransactionEntity;
  filterObject: ForecastFilterObject;
  amount: number;
  payee: string;
  scheduleId: string;
  scheduleName: string;
};

async function getSchedules() {
  const filter: Record<string, unknown> = {
    tombstone: false,
    completed: false,
  };

  const result = await aqlQuery(q('schedules').filter(filter).select('*'));
  return result.data as RawScheduleData[];
}

export function normalizeSchedule(
  schedule: RawScheduleData,
): ScheduleData | null {
  const conditions = extractScheduleConds(schedule._conditions || []);
  const accountId = schedule._account ?? conditions.account?.value;
  const amountValue = schedule._amount ?? conditions.amount?.value;
  const dateValue = schedule._date ?? conditions.date?.value;

  if (!accountId || amountValue == null || dateValue == null) {
    return null;
  }

  return {
    id: schedule.id,
    name: schedule.name,
    next_date: schedule.next_date,
    rule: schedule.rule,
    _payee: schedule._payee ?? conditions.payee?.value ?? null,
    _account: accountId,
    _amount: getScheduledAmount(amountValue),
    _date: dateValue,
  };
}

export async function getNormalizedSchedules() {
  const rawSchedules = await getSchedules();

  return rawSchedules.flatMap(schedule => {
    const normalizedSchedule = normalizeSchedule(schedule);
    return normalizedSchedule ? [normalizedSchedule] : [];
  });
}

async function getTransferPayeesByAccountIds(accountIds: string[]) {
  if (accountIds.length === 0) {
    return new Map<string, TransferPayee>();
  }

  const { data: payees } = await aqlQuery(
    q('payees')
      .filter({ transfer_acct: { $oneof: accountIds } })
      .select(['id', 'name', 'transfer_acct']),
  );

  return new Map(
    (payees as TransferPayee[])
      .filter(
        (payee): payee is TransferPayee & { transfer_acct: string } =>
          payee.transfer_acct != null,
      )
      .map(payee => [payee.transfer_acct, payee]),
  );
}

export function getFutureOccurrenceDates(
  schedule: ScheduleData,
  endDate: Date,
) {
  if (typeof schedule._date === 'string') {
    const singleDate = monthUtils.parseDate(schedule._date);
    return singleDate <= endDate ? [format(singleDate, 'yyyy-MM-dd')] : [];
  }

  const dateCondition = { op: 'is', field: 'date', value: schedule._date };
  const maxIterations = 10_000;
  const dates = [schedule.next_date];
  const seenDates = new Set(dates);
  let day = monthUtils.parseDate(schedule.next_date);
  let iterations = 0;

  while (day <= endDate && iterations < maxIterations) {
    iterations++;
    const nextDate = getNextDate(dateCondition, day);
    const parsedNextDate =
      nextDate != null ? monthUtils.parseDate(nextDate) : null;

    if (!nextDate || !parsedNextDate || parsedNextDate > endDate) {
      break;
    }

    if (parsedNextDate <= day) {
      if (seenDates.has(nextDate)) {
        day = monthUtils.parseDate(monthUtils.addDays(day, 1));
        continue;
      }
      break;
    }

    dates.push(nextDate);
    seenDates.add(nextDate);
    day = monthUtils.parseDate(monthUtils.addDays(nextDate, 1));
  }

  return dates;
}

export async function buildFutureScheduleOccurrences(
  schedules: ScheduleData[],
  endDateObj: Date,
  accountsById: Map<string, AccountWithComputedBalance>,
  ruleAccountsById: Map<string, DbAccountForRules>,
) {
  const transferPayeesByAccountId = await getTransferPayeesByAccountIds([
    ...ruleAccountsById.keys(),
  ]);
  const payeesById = new Map<string, Awaited<ReturnType<typeof db.getPayee>>>();
  const simulatedTransactions: TransactionEntity[] = [];
  const occurrences: Array<{
    accountId: string;
    transactionId: string;
    amount: number;
    scheduleId: string;
    scheduleName: string;
  }> = [];

  for (const schedule of schedules) {
    const scheduleName = schedule.name ?? 'Unknown';

    for (const date of getFutureOccurrenceDates(schedule, endDateObj)) {
      const baseTransaction: TransactionEntity = {
        id: `forecast-${schedule.id}-${date}`,
        account: schedule._account,
        amount: schedule._amount,
        payee: schedule._payee,
        date,
        schedule: schedule.id,
        cleared: false,
      };
      const sourceTransaction = await runRules(
        baseTransaction,
        ruleAccountsById,
      );
      simulatedTransactions.push(sourceTransaction);
      occurrences.push({
        accountId: sourceTransaction.account,
        transactionId: sourceTransaction.id,
        amount: sourceTransaction.amount,
        scheduleId: schedule.id,
        scheduleName,
      });

      let transferPayee = null;
      if (sourceTransaction.payee != null) {
        if (payeesById.has(sourceTransaction.payee)) {
          transferPayee = payeesById.get(sourceTransaction.payee) ?? null;
        } else {
          transferPayee = await db.getPayee(sourceTransaction.payee);
          payeesById.set(sourceTransaction.payee, transferPayee);
        }
      }
      const transferAccountId = transferPayee?.transfer_acct;

      if (
        !transferAccountId ||
        transferAccountId === sourceTransaction.account
      ) {
        continue;
      }

      const reverseTransferPayee = transferPayeesByAccountId.get(
        sourceTransaction.account,
      );
      const transferTransaction = await runRules(
        {
          id: `${sourceTransaction.id}-transfer`,
          account: transferAccountId,
          amount: -sourceTransaction.amount,
          payee: reverseTransferPayee?.id ?? null,
          date: sourceTransaction.date,
          transfer_id: sourceTransaction.id,
          notes: sourceTransaction.notes ?? null,
          schedule: sourceTransaction.schedule,
          cleared: false,
        },
        ruleAccountsById,
      );

      const sourceAccount = accountsById.get(sourceTransaction.account);
      const transferAccount = accountsById.get(transferTransaction.account);
      const shouldClearCategory =
        sourceAccount != null &&
        transferAccount != null &&
        sourceAccount.offbudget === transferAccount.offbudget;

      if (shouldClearCategory) {
        sourceTransaction.category = undefined;
        transferTransaction.category = undefined;
      }

      sourceTransaction.transfer_id = transferTransaction.id;
      simulatedTransactions.push(transferTransaction);
      occurrences.push({
        accountId: transferTransaction.account,
        transactionId: transferTransaction.id,
        amount: transferTransaction.amount,
        scheduleId: schedule.id,
        scheduleName,
      });
    }
  }

  const filterObjectsByTransactionId = await enrichForecastFilterObjects(
    simulatedTransactions,
    accountsById,
  );
  const transactionsById = new Map(
    simulatedTransactions.map(transaction => [transaction.id, transaction]),
  );

  return occurrences.map(occurrence => {
    const filterObject = filterObjectsByTransactionId.get(
      occurrence.transactionId,
    );
    const transaction = transactionsById.get(occurrence.transactionId);

    if (!filterObject || !transaction) {
      throw new Error('Missing simulated forecast transaction data');
    }

    return {
      transaction,
      filterObject,
      amount: occurrence.amount,
      payee: filterObject.payee?.name ?? occurrence.scheduleName,
      scheduleId: occurrence.scheduleId,
      scheduleName: occurrence.scheduleName,
    } satisfies ForecastScheduleOccurrence;
  });
}
