import React, { type ReactNode, useState, useEffect, useMemo } from 'react';

import { useResponsive } from '@actual-app/components/hooks/useResponsive';
import { styles } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import * as d from 'date-fns';

import { send } from 'loot-core/platform/client/fetch';
import * as monthUtils from 'loot-core/shared/months';
import { integerToCurrency } from 'loot-core/shared/util';
import {
  type TimeFrame,
  type AccountEntity,
  type RuleConditionEntity,
} from 'loot-core/types/models';

import { PrivacyFilter } from '../../PrivacyFilter';
import { Change } from '../Change';
import { NetWorthGraph } from '../graphs/NetWorthGraph';
import { Header } from '../Header';
import { calculateTimeRange } from '../reportRanges';
import { createSpreadsheet as netWorthSpreadsheet } from '../spreadsheets/net-worth-spreadsheet';
import { useReport } from '../useReport';
import { fromDateRepr } from '../util';

import { useLocale } from '@desktop-client/hooks/useLocale';
import { useRuleConditionFilters } from '@desktop-client/hooks/useRuleConditionFilters';
import { useSyncedPref } from '@desktop-client/hooks/useSyncedPref';

type NetWorthComponentProps = {
  accounts: AccountEntity[];
  hideFilters?: boolean;
  filterConditions?: RuleConditionEntity[];
  filterConditionsOp?: 'and' | 'or';
  initialTimeFrame?: TimeFrame;
  children?: (newFilter: {
    conditions: RuleConditionEntity[];
    conditionsOp: 'and' | 'or';
    timeFrame: TimeFrame;
  }) => ReactNode;
};

export function NetWorthComponent({
  accounts,
  hideFilters = false,
  filterConditions,
  filterConditionsOp,
  initialTimeFrame,
  children,
}: NetWorthComponentProps) {
  const locale = useLocale();

  const {
    conditions,
    conditionsOp,
    onApply: onApplyFilter,
    onDelete: onDeleteFilter,
    onUpdate: onUpdateFilter,
    onConditionsOpChange,
  } = useRuleConditionFilters(filterConditions, filterConditionsOp);

  const [allMonths, setAllMonths] = useState<Array<{
    name: string;
    pretty: string;
  }> | null>(null);

  const [initialStart, initialEnd, initialMode] =
    calculateTimeRange(initialTimeFrame);
  const [start, setStart] = useState(initialStart);
  const [end, setEnd] = useState(initialEnd);
  const [mode, setMode] = useState(initialMode);

  const reportParams = useMemo(
    () =>
      netWorthSpreadsheet(
        start,
        end,
        accounts,
        conditions,
        conditionsOp,
        locale,
      ),
    [start, end, accounts, conditions, conditionsOp, locale],
  );
  const data = useReport('net_worth', reportParams);
  useEffect(() => {
    async function run() {
      const trans = await send('get-earliest-transaction');
      const currentMonth = monthUtils.currentMonth();
      let earliestMonth = trans
        ? monthUtils.monthFromDate(d.parseISO(fromDateRepr(trans.date)))
        : currentMonth;

      // Make sure the month selects are at least populates with a
      // year's worth of months. We can undo this when we have fancier
      // date selects.
      const yearAgo = monthUtils.subMonths(monthUtils.currentMonth(), 12);
      if (earliestMonth > yearAgo) {
        earliestMonth = yearAgo;
      }

      const allMonths = monthUtils
        .rangeInclusive(earliestMonth, monthUtils.currentMonth())
        .map(month => ({
          name: month,
          pretty: monthUtils.format(month, 'MMMM, yyyy', locale),
        }))
        .reverse();

      setAllMonths(allMonths);
    }
    run();
  }, [locale]);

  function onChangeDates(start: string, end: string, mode: TimeFrame['mode']) {
    setStart(start);
    setEnd(end);
    setMode(mode);
  }

  const { isNarrowWidth } = useResponsive();

  const [earliestTransaction, _] = useState('');
  const [_firstDayOfWeekIdx] = useSyncedPref('firstDayOfWeekIdx');
  const firstDayOfWeekIdx = _firstDayOfWeekIdx || '0';

  if (!allMonths || !data) {
    return null;
  }

  return (
    <View>
      <Header
        allMonths={allMonths}
        start={start}
        end={end}
        earliestTransaction={earliestTransaction}
        firstDayOfWeekIdx={firstDayOfWeekIdx}
        mode={mode}
        onChangeDates={onChangeDates}
        filters={hideFilters ? undefined : conditions}
        onApply={onApplyFilter}
        onUpdateFilter={onUpdateFilter}
        onDeleteFilter={onDeleteFilter}
        conditionsOp={conditionsOp}
        onConditionsOpChange={onConditionsOpChange}
      >
        {children?.({
          conditions,
          conditionsOp,
          timeFrame: {
            start,
            end,
            mode,
          },
        })}
      </Header>

      <View
        style={{
          backgroundColor: theme.tableBackground,
          padding: 20,
          paddingTop: 0,
          flex: '1 0 auto',
          overflowY: 'auto',
        }}
      >
        <View
          style={{
            textAlign: 'right',
            paddingTop: 20,
          }}
        >
          <View
            style={{ ...styles.largeText, fontWeight: 400, marginBottom: 5 }}
          >
            <PrivacyFilter>{integerToCurrency(data.netWorth)}</PrivacyFilter>
          </View>
          <PrivacyFilter>
            <Change amount={data.totalChange} />
          </PrivacyFilter>
        </View>

        <NetWorthGraph
          graphData={data.graphData}
          showTooltip={!isNarrowWidth}
        />
      </View>
    </View>
  );
}
