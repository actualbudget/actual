import i18n from 'i18next';
import { Trans } from 'react-i18next';

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
  MONTHLY_BUDGET_OVERVIEW_PERIODS,
} from './monthlyBudgetOverviewPeriods';

type MonthlyBudgetOverviewSidebarProps = {
  month: string;
  period: MonthlyBudgetOverviewPeriod | null;
  monthOptions: Array<{ name: string; pretty: string }>;
  categoryGroups: CategoryGroupEntity[];
  selectedCategories: CategoryEntity[];
  onMonthChange: (month: string) => void;
  onPeriodChange: (period: MonthlyBudgetOverviewPeriod) => void;
  onSelectedCategoriesChange: (categories: CategoryEntity[]) => void;
};

export function MonthlyBudgetOverviewSidebar({
  month,
  period,
  monthOptions,
  categoryGroups,
  selectedCategories,
  onMonthChange,
  onPeriodChange,
  onSelectedCategoriesChange,
}: MonthlyBudgetOverviewSidebarProps) {
  const locale = useLocale();

  const periodOptions = MONTHLY_BUDGET_OVERVIEW_PERIODS.map(
    option => [option, getMonthlyBudgetOverviewPeriodLabel(option)] as const,
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
              <Trans>Date</Trans>
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
            <Trans>Month:</Trans>
          </Text>
          <Select
            value={month}
            onChange={onMonthChange}
            defaultLabel={monthUtils.format(month, 'MMMM, yyyy', locale)}
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
            value={(period ?? '') as MonthlyBudgetOverviewPeriod}
            defaultLabel={i18n.t('Custom month')}
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
