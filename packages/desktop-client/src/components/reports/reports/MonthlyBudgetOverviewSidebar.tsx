import { useMemo } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Select } from '@actual-app/components/select';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import * as monthUtils from '@actual-app/core/shared/months';
import type {
  CategoryEntity,
  CategoryGroupEntity,
  MonthlyBudgetOverviewPeriod,
} from '@actual-app/core/types/models';

import { CategorySelector } from '#components/reports/CategorySelector';
import { useLocale } from '#hooks/useLocale';

import {
  getMonthlyBudgetOverviewPeriodLabel,
  MONTHLY_BUDGET_OVERVIEW_PERIOD_OPTIONS,
} from './monthlyBudgetOverviewPeriods';

type MonthlyBudgetOverviewSidebarProps = {
  startMonth: string;
  endMonth: string;
  period: MonthlyBudgetOverviewPeriod | 'custom';
  monthOptions: Array<{ name: string; pretty: string }>;
  categoryGroups: CategoryGroupEntity[];
  selectedCategories: CategoryEntity[];
  onStartMonthChange: (month: string) => void;
  onEndMonthChange: (month: string) => void;
  onPeriodChange: (period: MonthlyBudgetOverviewPeriod | 'custom') => void;
  onSelectedCategoriesChange: (categories: CategoryEntity[]) => void;
};

export function MonthlyBudgetOverviewSidebar({
  startMonth,
  endMonth,
  period,
  monthOptions,
  categoryGroups,
  selectedCategories,
  onStartMonthChange,
  onEndMonthChange,
  onPeriodChange,
  onSelectedCategoriesChange,
}: MonthlyBudgetOverviewSidebarProps) {
  const locale = useLocale();
  const { t } = useTranslation();

  const periodOptions = useMemo(
    () =>
      MONTHLY_BUDGET_OVERVIEW_PERIOD_OPTIONS.map(
        option =>
          [option, getMonthlyBudgetOverviewPeriodLabel(option, t)] as const,
      ),
    [t],
  );

  return (
    <View
      style={{
        minWidth: 225,
        maxWidth: 250,
        paddingTop: 10,
        paddingRight: 10,
        flexShrink: 0,
        overflowY: 'auto',
      }}
    >
      <View style={{ flexShrink: 0 }}>
        <View
          style={{
            flexDirection: 'row',
            marginBottom: 5,
            alignItems: 'center',
          }}
        >
          <Text>
            <strong>
              <Trans>Date range</Trans>
            </strong>
          </Text>
        </View>
        <View
          style={{
            flexDirection: 'row',
            padding: 5,
            alignItems: 'center',
          }}
        >
          <Text style={{ width: 50, textAlign: 'right', marginRight: 5 }}>
            <Trans>From:</Trans>
          </Text>
          <Select
            value={startMonth}
            onChange={onStartMonthChange}
            defaultLabel={monthUtils.format(startMonth, 'MMMM, yyyy', locale)}
            options={monthOptions.map(({ name, pretty }) => [name, pretty])}
          />
        </View>
        <View
          style={{
            flexDirection: 'row',
            padding: 5,
            alignItems: 'center',
          }}
        >
          <Text style={{ width: 50, textAlign: 'right', marginRight: 5 }}>
            <Trans>To:</Trans>
          </Text>
          <Select
            value={endMonth}
            onChange={onEndMonthChange}
            defaultLabel={monthUtils.format(endMonth, 'MMMM, yyyy', locale)}
            options={monthOptions.map(({ name, pretty }) => [name, pretty])}
          />
        </View>
        <View
          style={{
            flexDirection: 'row',
            padding: 5,
            alignItems: 'center',
          }}
        >
          <Text style={{ width: 50, textAlign: 'right', marginRight: 5 }}>
            <Trans>Range:</Trans>
          </Text>
          <Select
            value={period}
            onChange={onPeriodChange}
            options={periodOptions}
          />
        </View>
        <View
          style={{
            height: 1,
            backgroundColor: theme.pillBorderDark,
            marginTop: 10,
            flexShrink: 0,
          }}
        />
      </View>
      <View
        style={{
          marginTop: 10,
          minHeight: 200,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            marginBottom: 5,
            alignItems: 'center',
          }}
        >
          <Text>
            <strong>
              <Trans>Categories</Trans>
            </strong>
          </Text>
        </View>
        <CategorySelector
          categoryGroups={categoryGroups}
          selectedCategories={selectedCategories}
          setSelectedCategories={onSelectedCategoriesChange}
        />
      </View>
    </View>
  );
}
