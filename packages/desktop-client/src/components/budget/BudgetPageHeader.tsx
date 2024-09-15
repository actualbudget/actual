// @ts-strict-ignore
import React, { type ComponentProps, memo } from 'react';

import { useLocalPref } from '../../hooks/useLocalPref';
import { View } from '../common/View';

import { MonthPicker } from './MonthPicker';
import { getScrollbarWidth } from './util';

type BudgetPageHeaderProps = {
  startMonth: string;
  onMonthSelect: (month: string) => void;
  numMonths: number;
  monthBounds: ComponentProps<typeof MonthPicker>['monthBounds'];
};

export const BudgetPageHeader = memo<BudgetPageHeaderProps>(
  ({ startMonth, onMonthSelect, numMonths, monthBounds }) => {
    const [categoryWidth = 200] = useLocalPref('category.width');

    return (
      <View style={{ marginLeft: categoryWidth + 5, flexShrink: 0 }}>
        <View style={{ marginRight: 5 + getScrollbarWidth() }}>
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
