import React, { useState } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { Trans, useTranslation } from 'react-i18next';

import { useResponsive } from '@actual-app/components/hooks/useResponsive';
import { SvgExclamationSolid } from '@actual-app/components/icons/v1';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { Tooltip } from '@actual-app/components/tooltip';
import { View } from '@actual-app/components/view';
import type {
  CustomReportEntity,
  DataEntity,
} from '@actual-app/core/types/models';
import type { JSONValue } from '@actual-app/core/types/report-spreadsheet';

import { ChooseGraph } from '#components/reports/ChooseGraph';
import { DateRange } from '#components/reports/DateRange';
import { LoadingIndicator } from '#components/reports/LoadingIndicator';
import { ReportCard } from '#components/reports/ReportCard';
import { ReportCardName } from '#components/reports/ReportCardName';
import { calculateHasWarning } from '#components/reports/util';
import { useAccounts } from '#hooks/useAccounts';
import { useCategories } from '#hooks/useCategories';
import { usePayees } from '#hooks/usePayees';
import { addNotification } from '#notifications/notificationsSlice';
import { useDispatch } from '#redux';
import { useUpdateReportMutation } from '#reports/mutations';

import { MissingReportCard } from './MissingReportCard';

type CustomReportListCardsProps = {
  widgetId: string;
  isEditing?: boolean;
  report?: CustomReportEntity;
  reportData?: JSONValue;
};

type CustomReportCellData = DataEntity & {
  [key: string]: JSONValue;
  intervalsCount: number;
};

function isCustomReportCellData(
  value: JSONValue | undefined,
): value is CustomReportCellData {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Array.isArray(value.data) &&
    Array.isArray(value.intervalData) &&
    typeof value.intervalsCount === 'number'
  );
}

function ErrorFallback() {
  return (
    <>
      <div>
        <br />
      </div>
      <Text style={{ ...styles.mediumText, color: theme.errorText }}>
        <Trans>There was a problem loading your report</Trans>
      </Text>
    </>
  );
}

export function CustomReportListCards({
  widgetId,
  isEditing,
  report,
  reportData,
}: CustomReportListCardsProps) {
  // It's possible for a dashboard to reference a non-existing
  // custom report
  if (!report) {
    return (
      <MissingReportCard widgetId={widgetId} isEditing={isEditing}>
        <Trans>This custom report has been deleted.</Trans>
      </MissingReportCard>
    );
  }

  return (
    <CustomReportListCardsInner
      widgetId={widgetId}
      isEditing={isEditing}
      report={report}
      reportData={reportData}
    />
  );
}

function CustomReportListCardsInner({
  widgetId,
  isEditing,
  report,
  reportData,
}: CustomReportListCardsProps & {
  report: CustomReportEntity;
}) {
  const { t } = useTranslation();
  const { isNarrowWidth } = useResponsive();

  const dispatch = useDispatch();

  const [nameMenuOpen, setNameMenuOpen] = useState(false);

  const { data: payees = [] } = usePayees();
  const { data: accounts = [] } = useAccounts();
  const { data: categories = { list: [], grouped: [] } } = useCategories();

  const hasWarning = calculateHasWarning(report.conditions ?? [], {
    categories: categories.list,
    payees,
    accounts,
  });

  const updateReportMutation = useUpdateReportMutation();
  const data = isCustomReportCellData(reportData) ? reportData : null;

  const onSaveName = async (name: string) => {
    const updatedReport = {
      ...report,
      name,
    };

    updateReportMutation.mutate(
      { report: updatedReport },
      {
        onSuccess: () => {
          setNameMenuOpen(false);
        },
        onError: error => {
          dispatch(
            addNotification({
              notification: {
                type: 'error',
                message: t('Failed saving report name: {{error}}', {
                  error: error.message,
                }),
              },
            }),
          );
          setNameMenuOpen(true);
        },
      },
    );
  };

  return (
    <ReportCard
      widgetId={widgetId}
      isEditing={isEditing}
      disableClick={nameMenuOpen}
      to={`/reports/custom/${report.id}`}
      onRename={() => setNameMenuOpen(true)}
    >
      <View style={{ flex: 1, padding: 10 }}>
        <View
          style={{
            flexShrink: 0,
            paddingBottom: 5,
          }}
        >
          <View style={{ flex: 1 }}>
            <ReportCardName
              name={report.name}
              isEditing={nameMenuOpen}
              onChange={onSaveName}
              onClose={() => setNameMenuOpen(false)}
            />
            {report.isDateStatic ? (
              <DateRange start={report.startDate} end={report.endDate} />
            ) : (
              <Text style={{ color: theme.pageTextSubdued }}>
                {t(report.dateRange)}
              </Text>
            )}
          </View>
        </View>
        {data ? (
          <ErrorBoundary FallbackComponent={ErrorFallback}>
            <ChooseGraph
              data={data}
              mode={report.mode}
              graphType={report.graphType}
              balanceType={report.balanceType}
              groupBy={report.groupBy}
              interval={report.interval}
              compact
              style={{ height: 'auto', flex: 1 }}
              intervalsCount={data.intervalsCount}
              showTrendLines={report.showTrendLines}
              showTooltip={!isNarrowWidth && !isEditing}
            />
          </ErrorBoundary>
        ) : (
          <LoadingIndicator />
        )}
      </View>
      {hasWarning && (
        <View style={{ padding: 5, position: 'absolute', bottom: 0 }}>
          <Tooltip
            content={t(
              'The widget is configured to use a non-existing filter value (i.e. category/account/payee). Edit the filters used in this report widget to remove the warning.',
            )}
            placement="bottom start"
            style={{ ...styles.tooltip, maxWidth: 300 }}
          >
            <SvgExclamationSolid
              width={20}
              height={20}
              style={{ color: theme.warningText }}
            />
          </Tooltip>
        </View>
      )}
    </ReportCard>
  );
}
