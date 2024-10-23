// @ts-strict-ignore

import { useMemo } from 'react';

import { type RuleConditionEntity } from 'loot-core/types/models';

import { cashFlowByDate } from '../spreadsheets/cash-flow-spreadsheet';
import { useReport } from '../useReport';

export const useCashFlowDataDetailed = (
  startMonth: string,
  endMonth: string,
  isConcise: boolean,
  conditions: RuleConditionEntity[] = [],
  conditionsOp: 'and' | 'or',
) => {
  const paramsDetailed = useMemo(
    () =>
      cashFlowByDate(startMonth, endMonth, isConcise, conditions, conditionsOp),
    [startMonth, endMonth, isConcise, conditions, conditionsOp],
  );

  return useReport('cash_flow', paramsDetailed);
};
