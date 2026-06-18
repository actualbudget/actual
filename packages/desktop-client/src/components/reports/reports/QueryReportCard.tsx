import { useMemo, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import * as monthUtils from 'loot-core/shared/months';
import type { ChartSpec } from 'loot-core/types/chart-spec';
import type { QueryReportWidget } from 'loot-core/types/models';

import { ChartRenderer } from '@desktop-client/components/query-report/visualizations/ChartRenderer';
import { LoadingIndicator } from '@desktop-client/components/reports/LoadingIndicator';
import { ReportCard } from '@desktop-client/components/reports/ReportCard';
import { ReportCardName } from '@desktop-client/components/reports/ReportCardName';
import { useDashboardWidgetCopyMenu } from '@desktop-client/components/reports/useDashboardWidgetCopyMenu';
import { useFeatureFlag } from '@desktop-client/hooks/useFeatureFlag';
import { useQueryReport } from '@desktop-client/hooks/useQueryReport';

type QueryReportCardProps = {
  widgetId: string;
  isEditing?: boolean;
  meta?: QueryReportWidget['meta'];
  onMetaChange: (newMeta: QueryReportWidget['meta']) => void;
  onRemove: () => void;
  onCopy: (targetDashboardId: string) => void;
};

const DEFAULT_CHART_SPEC: ChartSpec = { mark: 'table', encoding: {} };

export function QueryReportCard({
  widgetId,
  isEditing,
  meta,
  onMetaChange,
  onRemove,
  onCopy,
}: QueryReportCardProps) {
  const { t } = useTranslation();
  const isFeatureFlagEnabled = useFeatureFlag('queryReport');
  const [nameMenuOpen, setNameMenuOpen] = useState(false);
  const { menuItems: copyMenuItems, handleMenuSelect: handleCopyMenuSelect } =
    useDashboardWidgetCopyMenu(onCopy);

  const firstQuery = meta?.queries?.[0];
  const querySource = useMemo(() => {
    return firstQuery?.source ?? '';
  }, [firstQuery]);

  const chartSpec = meta?.chartSpec ?? DEFAULT_CHART_SPEC;

  const { result, isLoading, error } = useQueryReport(
    querySource || null,
    meta?.defaultTimeFrame,
  );

  const rangeLabel = (() => {
    const df = meta?.defaultTimeFrame;
    if (!df) return null;
    if (!querySource) return null;
    if (!/:startDate|:endDate/.test(querySource)) return null;
    switch (df.mode) {
      case 'sliding-window': {
        const offset = monthUtils.differenceInCalendarMonths(df.end, df.start);
        if (offset === 0) return t('1 month');
        if (offset === 2) return t('Last 3 months');
        if (offset === 5) return t('Last 6 months');
        if (offset === 11) return t('1 year');
        return null;
      }
      case 'yearToDate':
        return t('Year to date');
      case 'lastMonth':
        return t('Last month');
      case 'lastYear':
        return t('Last year');
      case 'priorYearToDate':
        return t('Prior year to date');
      case 'full':
        return t('All time');
      default:
        return null;
    }
  })();

  if (!isFeatureFlagEnabled) return null;

  return (
    <ReportCard
      isEditing={isEditing}
      disableClick={nameMenuOpen}
      to={`/reports/query/${widgetId}`}
      menuItems={[
        {
          name: 'rename',
          text: t('Rename'),
        },
        {
          name: 'remove',
          text: t('Remove'),
        },
        ...copyMenuItems,
      ]}
      onMenuSelect={item => {
        if (handleCopyMenuSelect(item)) return;
        switch (item) {
          case 'rename':
            setNameMenuOpen(true);
            break;
          case 'remove':
            onRemove();
            break;
          default:
            break;
        }
      }}
    >
      <View style={{ flex: 1, overflow: 'hidden', padding: 12 }}>
        <View style={{ flexGrow: 0, flexShrink: 0, marginBottom: 8 }}>
          <ReportCardName
            name={meta?.name || t('Query Report')}
            isEditing={nameMenuOpen}
            onChange={newName => {
              onMetaChange({
                ...meta,
                name: newName,
              });
              setNameMenuOpen(false);
            }}
            onClose={() => setNameMenuOpen(false)}
          />
          {rangeLabel && (
            <div
              style={{
                color: theme.pageTextSubdued,
                marginTop: 2,
              }}
            >
              {rangeLabel}
            </div>
          )}
        </View>
        <View
          style={{
            flexGrow: 1,
            flexShrink: 1,
            overflow: 'hidden',
          }}
        >
          {isLoading && <LoadingIndicator />}
          {error && (
            <View
              style={{
                flex: 1,
                justifyContent: 'center',
                alignItems: 'center',
                color: theme.errorText,
                fontSize: 12,
                padding: 8,
              }}
            >
              {error.message}
            </View>
          )}
          {!isLoading && !error && result && (
            <ChartRenderer result={result} spec={chartSpec} compact />
          )}
          {!isLoading && !error && !result && !querySource && (
            <View
              style={{
                flex: 1,
                justifyContent: 'center',
                alignItems: 'center',
                color: theme.pageTextSubdued,
              }}
            >
              <Trans>No query configured</Trans>
            </View>
          )}
        </View>
      </View>
    </ReportCard>
  );
}
