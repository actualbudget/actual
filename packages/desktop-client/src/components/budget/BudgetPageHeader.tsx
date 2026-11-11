import React, { memo } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { View } from '@actual-app/components/view';

import { PageTitle } from '#components/PageTitle';
import { useSyncedPref } from '#hooks/useSyncedPref';

import { MonthCountSelector } from './MonthCountSelector';

type BudgetPageHeaderProps = {
  maxMonths: number;
  onMaxMonthsChange: (value: number) => void;
  onGoToToday: () => void;
};

/**
 * Title row of the budget page. The month itself is chosen with the month
 * strip rendered above the table, so this row only carries the page title,
 * a one-line explanation for newcomers, and the page-level controls.
 */
export const BudgetPageHeader = memo<BudgetPageHeaderProps>(
  ({ maxMonths, onMaxMonthsChange, onGoToToday }) => {
    const { t } = useTranslation();
    const [budgetType = 'envelope'] = useSyncedPref('budgetType');

    return (
      <View
        data-testid="budget-page-header"
        style={{
          flexDirection: 'row',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: 16,
          flexShrink: 0,
          paddingBottom: 14,
        }}
      >
        <PageTitle
          title={t('Budget')}
          subtitle={
            budgetType === 'tracking'
              ? t(
                  'Set a target for each category and compare it with what actually happened. Click any budgeted amount to change it.',
                )
              : t(
                  'Give every dollar in your accounts a job by assigning it to a category. Click any budgeted amount to change it.',
                )
          }
        />
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            flexShrink: 0,
          }}
        >
          <MonthCountSelector
            maxMonths={maxMonths}
            onChange={onMaxMonthsChange}
          />
          <Button variant="normal" onPress={onGoToToday}>
            <Trans>Today</Trans>
          </Button>
        </View>
      </View>
    );
  },
);

BudgetPageHeader.displayName = 'BudgetPageHeader';
