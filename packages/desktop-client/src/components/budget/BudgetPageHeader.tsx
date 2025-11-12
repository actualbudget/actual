// @ts-strict-ignore
import React, { type ComponentProps, memo } from 'react';
import { Trans } from 'react-i18next';

import { View } from '@actual-app/components/view';

import { MonthPicker } from './MonthPicker';
import { getScrollbarWidth } from './util';

import { useFeatureFlag } from '@desktop-client/hooks/useFeatureFlag';
import { useGlobalPref } from '@desktop-client/hooks/useGlobalPref';
import { useSyncedPref } from '@desktop-client/hooks/useSyncedPref';

type BudgetPageHeaderProps = {
  startMonth: string;
  onMonthSelect: (month: string) => void;
  numMonths: number;
  monthBounds: ComponentProps<typeof MonthPicker>['monthBounds'];
};

export const BudgetPageHeader = memo<BudgetPageHeaderProps>(
  ({ startMonth, onMonthSelect, numMonths, monthBounds }) => {
    const [categoryExpandedStatePref] = useGlobalPref('categoryExpandedState');
    const categoryExpandedState = categoryExpandedStatePref ?? 0;
    const offsetMultipleMonths = numMonths === 1 ? 4 : 0;
    const payPeriodFeatureFlagEnabled = useFeatureFlag('payPeriodsEnabled');
    const [payPeriodViewEnabled, setPayPeriodViewEnabled] =
      useSyncedPref('showPayPeriods');

    return (
      <View
        style={{
          marginLeft:
            200 + 100 * categoryExpandedState + 5 - offsetMultipleMonths,
          flexShrink: 0,
        }}
      >
        {payPeriodFeatureFlagEnabled && (
          <View style={{ alignItems: 'center', marginBottom: 5 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input
                type="checkbox"
                checked={String(payPeriodViewEnabled) === 'true'}
                onChange={e =>
                  setPayPeriodViewEnabled(e.target.checked ? 'true' : 'false')
                }
              />
              <span>
                <Trans>Show pay periods</Trans>
              </span>
            </label>
          </View>
        )}
        <View
          style={{
            marginRight: 5 + getScrollbarWidth() - offsetMultipleMonths,
          }}
        >
          <MonthPicker
            startMonth={startMonth}
            numDisplayed={numMonths}
            monthBounds={monthBounds}
            style={{ paddingTop: 5 }}
            onSelect={month => onMonthSelect(month)}
          />
        </View>
      </View>
    );
  },
);

BudgetPageHeader.displayName = 'BudgetPageHeader';
