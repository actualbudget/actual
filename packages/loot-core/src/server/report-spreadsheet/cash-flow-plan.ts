import { Spreadsheet } from '#server/spreadsheet/spreadsheet';
import { resolveName } from '#server/spreadsheet/util';
import { conditionsToAQL } from '#server/transactions/transaction-rules';
import * as monthUtils from '#shared/months';
import { q } from '#shared/query';
import type {
  CashFlowWidget,
  RuleConditionEntity,
  TimeFrame,
} from '#types/models';
import type { JSONValue } from '#types/report-spreadsheet';

import { calculateTimeRange, hashString, stableStringify } from './plan-utils';
import type { ReportPlan } from './types';

const defaultTimeFrame = {
  start: monthUtils.dayFromDate(monthUtils.currentMonth()),
  end: monthUtils.currentDay(),
  mode: 'sliding-window',
} satisfies TimeFrame;

function conditionsToFilters(conditions?: RuleConditionEntity[]) {
  return conditionsToAQL((conditions ?? []).filter(cond => !cond.customName))
    .filters;
}

function makeCashFlowQuery({
  amountOp,
  conditions,
  conditionsOp,
  endDay,
  startDay,
}: {
  amountOp: '$gt' | '$lt';
  conditions: RuleConditionEntity[] | undefined;
  conditionsOp: 'and' | 'or' | undefined;
  endDay: string;
  startDay: string;
}) {
  const conditionsOpKey = conditionsOp === 'or' ? '$or' : '$and';
  return q('transactions')
    .filter({
      [conditionsOpKey]: conditionsToFilters(conditions),
    })
    .filter({
      $and: [{ date: { $gte: startDay } }, { date: { $lte: endDay } }],
      'account.offbudget': false,
      'payee.transfer_acct': null,
      amount: { [amountOp]: 0 },
    })
    .calculate({ $sum: '$amount' })
    .serialize();
}

function calculateCashFlowData({
  expense,
  income,
}: {
  expense: unknown;
  income: unknown;
}): JSONValue {
  return {
    graphData: {
      expense: typeof expense === 'number' ? expense : 0,
      income: typeof income === 'number' ? income : 0,
    },
  };
}

export function createCashFlowReportPlan({
  latestTransactionDate,
  sheet,
  widget,
}: {
  latestTransactionDate: string | null;
  sheet: Spreadsheet;
  widget: CashFlowWidget;
}): ReportPlan {
  const meta = widget.meta;
  const [start, end] = calculateTimeRange(
    meta?.timeFrame,
    defaultTimeFrame,
    latestTransactionDate,
  );
  const startDay = monthUtils.firstDayOfMonth(start);
  const rawEndDay = monthUtils.lastDayOfMonth(end);
  const endDay =
    rawEndDay > monthUtils.currentDay() ? monthUtils.currentDay() : rawEndDay;
  const planHash = hashString(
    stableStringify({
      conditions: meta?.conditions,
      conditionsOp: meta?.conditionsOp,
      endDay,
      start,
      startDay,
      type: widget.type,
    }),
  );
  const sheetName = `report:${widget.id}:${planHash}`;
  const incomeCell = resolveName(sheetName, 'income-query');
  const expenseCell = resolveName(sheetName, 'expense-query');
  const queryCells = [incomeCell, expenseCell];

  sheet.createQuery(
    sheetName,
    'income-query',
    makeCashFlowQuery({
      amountOp: '$gt',
      conditions: meta?.conditions,
      conditionsOp: meta?.conditionsOp,
      endDay,
      startDay,
    }),
  );
  sheet.createQuery(
    sheetName,
    'expense-query',
    makeCashFlowQuery({
      amountOp: '$lt',
      conditions: meta?.conditions,
      conditionsOp: meta?.conditionsOp,
      endDay,
      startDay,
    }),
  );

  sheet.createDynamic(sheetName, 'data', {
    dependencies: queryCells,
    initialValue: null,
    run: (income, expense) => calculateCashFlowData({ expense, income }),
  });

  return {
    queryCells,
    rootName: resolveName(sheetName, 'data'),
    sheetName,
    widgetId: widget.id,
  };
}
