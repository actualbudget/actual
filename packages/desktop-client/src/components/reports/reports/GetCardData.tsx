import React, { useMemo } from 'react';
import { ErrorBoundary } from 'react-error-boundary';

import { type AccountEntity } from 'loot-core/types/models/account';
import { type CategoryEntity } from 'loot-core/types/models/category';
import { type CategoryGroupEntity } from 'loot-core/types/models/category-group';
import { type PayeeEntity } from 'loot-core/types/models/payee';
import { type CustomReportEntity } from 'loot-core/types/models/reports';

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

export function GetCardData({
  report,
  payees,
  accounts,
  categories,
  earliestTransaction,
}: {
  report: CustomReportEntity;
  payees: PayeeEntity[];
  accounts: AccountEntity[];
  categories: { list: CategoryEntity[]; grouped: CategoryGroupEntity[] };
  earliestTransaction: string;
}) {
  let startDate = report.startDate;
  let endDate = report.endDate;

  if (!report.isDateStatic) {
    const [dateStart, dateEnd] = getLiveRange(
      report.dateRange,
      earliestTransaction,
    );
    startDate = dateStart || report.startDate;
    endDate = dateEnd || report.startDate;
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
    });
  }, [report, categories, startDate, endDate]);
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
    });
  }, [report, categories, payees, accounts, startDate, endDate]);
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
      />
    </ErrorBoundary>
  ) : (
    <LoadingIndicator />
  );
}
