import { useMemo, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Block } from '@actual-app/components/block';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import * as monthUtils from '@actual-app/core/shared/months';
import type { MonthlyBudgetOverviewWidget } from '@actual-app/core/types/models';

import { LoadingIndicator } from '#components/reports/LoadingIndicator';
import { MonthlyBudgetOverviewSummary } from '#components/reports/reports/MonthlyBudgetOverviewSummary';
import { ReportCard } from '#components/reports/ReportCard';
import { ReportCardName } from '#components/reports/ReportCardName';
import { useDashboardWidgetCopyMenu } from '#components/reports/useDashboardWidgetCopyMenu';
import { useAutomationOverview } from '#hooks/useAutomationOverview';
import { useLocale } from '#hooks/useLocale';

type MonthlyBudgetOverviewCardProps = {
  widgetId: string;
  isEditing?: boolean;
  meta?: MonthlyBudgetOverviewWidget['meta'];
  onMetaChange: (newMeta: MonthlyBudgetOverviewWidget['meta']) => void;
  onRemove: () => void;
  onCopy: (targetDashboardId: string) => void;
};

export function MonthlyBudgetOverviewCard({
  widgetId,
  isEditing,
  meta = {},
  onMetaChange,
  onRemove,
  onCopy,
}: MonthlyBudgetOverviewCardProps) {
  const { t } = useTranslation();
  const locale = useLocale();
  const [nameMenuOpen, setNameMenuOpen] = useState(false);

  const { menuItems: copyMenuItems, handleMenuSelect: handleCopyMenuSelect } =
    useDashboardWidgetCopyMenu(onCopy);

  const month = meta?.month ?? monthUtils.currentMonth();
  const { data, loading } = useAutomationOverview(month);

  const monthLabel = useMemo(
    () => monthUtils.format(month, 'MMMM yyyy', locale),
    [month, locale],
  );

  return (
    <ReportCard
      isEditing={isEditing}
      disableClick={nameMenuOpen}
      to={`/reports/monthly-budget-overview/${widgetId}`}
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
            throw new Error(`Unrecognized selection: ${item}`);
        }
      }}
    >
      <View style={{ flex: 1, padding: 20 }}>
        <ReportCardName
          name={meta?.name || t('Monthly Budget Overview')}
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
        <Block
          style={{
            marginTop: 8,
            marginBottom: 16,
            color: theme.pageTextSubdued,
          }}
        >
          {monthLabel}
        </Block>
        {loading || !data ? (
          <LoadingIndicator />
        ) : data.categories.length === 0 ? (
          <Block style={{ color: theme.pageTextSubdued }}>
            <Trans>No categories have budget automations.</Trans>
          </Block>
        ) : (
          <MonthlyBudgetOverviewSummary data={data} compact />
        )}
      </View>
    </ReportCard>
  );
}
