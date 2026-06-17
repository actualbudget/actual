import { useMemo, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import type { ChartSpec } from 'loot-core/types/chart-spec';
import type { QueryReportWidget } from 'loot-core/types/models';

import { ChartRenderer } from '@desktop-client/components/query-report/visualizations/ChartRenderer';
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
      <View style={{ flex: 1, overflow: 'hidden', padding: 20 }}>
        <View style={{ flexGrow: 0, flexShrink: 0, marginBottom: 12 }}>
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
        </View>
        <View
          style={{
            flexGrow: 1,
            flexShrink: 1,
            overflow: 'hidden',
          }}
        >
          {isLoading && (
            <View
              style={{
                flex: 1,
                justifyContent: 'center',
                alignItems: 'center',
                color: theme.pageTextSubdued,
              }}
            >
              {t('Loading...')}
            </View>
          )}
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
          {!isLoading && !error && !result && (
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
