import { useMemo, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Block } from '@actual-app/components/block';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import * as monthUtils from '@actual-app/core/shared/months';
import type { MonthlyBudgetOverviewWidget } from '@actual-app/core/types/models';

import { LoadingIndicator } from '#components/reports/LoadingIndicator';
import { ReportCard } from '#components/reports/ReportCard';
import { ReportCardName } from '#components/reports/ReportCardName';
import { MonthlyBudgetOverviewSummary } from '#components/reports/reports/MonthlyBudgetOverviewSummary';
import { useDashboardWidgetCopyMenu } from '#components/reports/useDashboardWidgetCopyMenu';
import { useAutomationOverview } from '#hooks/useAutomationOverview';
import { useLocale } from '#hooks/useLocale';

import { getMonthlyBudgetOverviewMonth, MONTHLY_BUDGET_OVERVIEW_PERIODS } from './monthlyBudgetOverviewPeriods';

type MonthlyBudgetOverviewCardProps = {
  widgetId: string;
  isEditing?: boolean;
  meta?: MonthlyBudgetOverviewWidget['meta'];
  onMetaChange: (newMeta: MonthlyBudgetOverviewWidget['meta']) => void;
  onRemove: () => void;
  onCopy: (targetDashboardId: string) => void;
};

function getCardMonth(meta: MonthlyBudgetOverviewWidget['meta']) {
  const currentMonth = monthUtils.currentMonth();

  if (meta?.month) {
    return meta.month;
  }

  if (meta?.startMonth) {
    return meta.startMonth;
  }

  if (
    meta?.period &&
    MONTHLY_BUDGET_OVERVIEW_PERIODS.includes(meta.period)
  ) {
    return getMonthlyBudgetOverviewMonth(meta.period);
  }

  return currentMonth;
}

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

  const month = getCardMonth(meta);
  const { data, loading } = useAutomationOverview(month, month);

  const periodLabel = useMemo(
    () => monthUtils.format(month, 'MMMM yyyy', locale),
    [month, locale],
  );

  const hasCategories =
    data != null && data.groups.some(group => group.categories.length > 0);

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
          {periodLabel}
        </Block>
        {loading || !data ? (
          <LoadingIndicator />
        ) : !hasCategories ? (
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
