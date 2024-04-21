import React, { useMemo } from 'react';
import { ErrorBoundary } from 'react-error-boundary';

import * as monthUtils from 'loot-core/src/shared/months';
import { type AccountEntity } from 'loot-core/types/models/account';
import { type CategoryEntity } from 'loot-core/types/models/category';
import { type CategoryGroupEntity } from 'loot-core/types/models/category-group';
import { type PayeeEntity } from 'loot-core/types/models/payee';
import { type CustomReportEntity } from 'loot-core/types/models/reports';
import { type LocalPrefs } from 'loot-core/types/prefs';

import { styles } from '../../../style/styles';
import { theme } from '../../../style/theme';
import { Text } from '../../common/Text';
import { ChooseGraph } from '../ChooseGraph';
import { getLiveRange } from '../getLiveRange';
import { LoadingIndicator } from '../LoadingIndicator';
import { ReportOptions } from '../ReportOptions';
import { createCustomSpreadsheet } from '../spreadsheets/custom-spreadsheet';
import { createGroupedSpreadsheet } from '../spreadsheets/grouped-spreadsheet';
import { useReport } from '../useReport';

function ErrorFallback() {
  return (
    <>
      <div>
        <br />
      </div>
      <Text style={{ ...styles.mediumText, color: theme.errorText }}>
        There was a problem loading your report
      </Text>
    </>
  );
}

function convertFromDate(
  interval: string | undefined,
): 'dayFromDate' | 'monthFromDate' | 'yearFromDate' {
  switch (interval) {
    case 'Monthly':
      return 'monthFromDate';
    case 'Yearly':
      return 'yearFromDate';
    default:
      return 'dayFromDate';
  }
}

function convertRangeInclusive(
  interval: string | undefined,
): 'dayRangeInclusive' | 'rangeInclusive' | 'yearRangeInclusive' {
  switch (interval) {
    case 'Monthly':
      return 'rangeInclusive';
    case 'Yearly':
      return 'yearRangeInclusive';
    default:
      return 'dayRangeInclusive';
  }
}

export function GetCardData({
  report,
  payees,
  accounts,
  categories,
  earliestTransaction,
  firstDayOfWeekIdx,
}: {
  report: CustomReportEntity;
  payees: PayeeEntity[];
  accounts: AccountEntity[];
  categories: { list: CategoryEntity[]; grouped: CategoryGroupEntity[] };
  earliestTransaction: string;
  firstDayOfWeekIdx?: LocalPrefs['firstDayOfWeekIdx'];
}) {
  let startDate = report.startDate;
  let endDate = report.endDate;

  if (!report.isDateStatic) {
    const [dateStart, dateEnd] = getLiveRange(
      report.dateRange,
      earliestTransaction,
      firstDayOfWeekIdx,
    );
    startDate = dateStart || report.startDate;
    endDate = dateEnd || report.startDate;
  }

  const fromDate = convertFromDate(report.interval);
  const rangeInclusive = convertRangeInclusive(report.interval);

  let intervalDateStart;
  let intervalDateEnd;
  let intervals;
  if (report.interval === 'Weekly') {
    intervalDateStart = monthUtils.weekFromDate(startDate, firstDayOfWeekIdx);
    intervalDateEnd = monthUtils.weekFromDate(endDate, firstDayOfWeekIdx);
    intervals = monthUtils.weekRangeInclusive(
      intervalDateStart,
      intervalDateEnd,
      firstDayOfWeekIdx,
    );
  } else {
    intervalDateStart = monthUtils[fromDate](startDate);
    intervalDateEnd = monthUtils[fromDate](endDate);
    intervals = monthUtils[rangeInclusive](intervalDateStart, intervalDateEnd);
  }

  const getGroupData = useMemo(() => {
    return createGroupedSpreadsheet({
      startDate,
      endDate,
      interval: report.interval,
      categories,
      selectedCategories: report.selectedCategories ?? categories.list,
      conditions: report.conditions ?? [],
      conditionsOp: report.conditionsOp,
      showEmpty: report.showEmpty,
      showOffBudget: report.showOffBudget,
      showHiddenCategories: report.showHiddenCategories,
      showUncategorized: report.showUncategorized,
      balanceTypeOp: ReportOptions.balanceTypeMap.get(report.balanceType),
      firstDayOfWeekIdx,
    });
  }, [report, categories, startDate, endDate, firstDayOfWeekIdx]);
  const getGraphData = useMemo(() => {
    return createCustomSpreadsheet({
      startDate,
      endDate,
      interval: report.interval,
      categories,
      selectedCategories: report.selectedCategories ?? categories.list,
      conditions: report.conditions ?? [],
      conditionsOp: report.conditionsOp,
      showEmpty: report.showEmpty,
      showOffBudget: report.showOffBudget,
      showHiddenCategories: report.showHiddenCategories,
      showUncategorized: report.showUncategorized,
      groupBy: report.groupBy,
      balanceTypeOp: ReportOptions.balanceTypeMap.get(report.balanceType),
      payees,
      accounts,
      graphType: report.graphType,
      firstDayOfWeekIdx,
    });
  }, [
    report,
    categories,
    payees,
    accounts,
    startDate,
    endDate,
    firstDayOfWeekIdx,
  ]);
  const graphData = useReport('default' + report.name, getGraphData);
  const groupedData = useReport('grouped' + report.name, getGroupData);

  const data =
    graphData && groupedData ? { ...graphData, groupedData } : graphData;

  return data?.data ? (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <ChooseGraph
        data={data}
        mode={report.mode}
        graphType={report.graphType}
        balanceType={report.balanceType}
        groupBy={report.groupBy}
        interval={report.interval}
        compact={true}
        style={{ height: 'auto', flex: 1 }}
        intervalsCount={intervals.length}
      />
    </ErrorBoundary>
  ) : (
    <LoadingIndicator />
  );
}
