import { useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { useResponsive } from '@actual-app/components/hooks/useResponsive';
import {
  SvgCheveronLeft,
  SvgCheveronRight,
} from '@actual-app/components/icons/v1';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import * as monthUtils from '@actual-app/core/shared/months';
import type { MonthlyBudgetOverviewPeriod } from '@actual-app/core/types/models';

import {
  getMonthlyBudgetOverviewPeriodLabel,
  MONTHLY_BUDGET_OVERVIEW_PERIODS,
} from './monthlyBudgetOverviewPeriods';
import { useLocale } from '#hooks/useLocale';

type MonthlyBudgetOverviewControlsProps = {
  anchorMonth: string;
  period: MonthlyBudgetOverviewPeriod;
  onAnchorMonthChange: (month: string) => void;
  onPeriodChange: (period: MonthlyBudgetOverviewPeriod) => void;
};

export function MonthlyBudgetOverviewControls({
  anchorMonth,
  period,
  onAnchorMonthChange,
  onPeriodChange,
}: MonthlyBudgetOverviewControlsProps) {
  const locale = useLocale();
  const { t } = useTranslation();
  const { isNarrowWidth } = useResponsive();

  const monthLabel = monthUtils.format(anchorMonth, 'MMMM yyyy', locale);

  return (
    <View
      style={{
        padding: 15,
        backgroundColor: theme.tableBackground,
        borderBottom: `1px solid ${theme.tableBorder}`,
        gap: 12,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
        }}
      >
        <Button
          variant="bare"
          aria-label={t('Previous month')}
          onPress={() =>
            onAnchorMonthChange(monthUtils.subMonths(anchorMonth, 1))
          }
        >
          <SvgCheveronLeft width={14} height={14} />
        </Button>
        <View style={{ minWidth: 140, textAlign: 'center', fontWeight: 600 }}>
          {monthLabel}
        </View>
        <Button
          variant="bare"
          aria-label={t('Next month')}
          onPress={() =>
            onAnchorMonthChange(monthUtils.addMonths(anchorMonth, 1))
          }
        >
          <SvgCheveronRight width={14} height={14} />
        </Button>
      </View>

      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 6,
          justifyContent: isNarrowWidth ? 'flex-start' : 'center',
        }}
      >
        {MONTHLY_BUDGET_OVERVIEW_PERIODS.map(option => (
          <Button
            key={option}
            variant={period === option ? 'primary' : 'normal'}
            onPress={() => onPeriodChange(option)}
          >
            {getMonthlyBudgetOverviewPeriodLabel(option, t)}
          </Button>
        ))}
      </View>
    </View>
  );
}
