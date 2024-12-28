// @ts-strict-ignore
import React, { type ComponentProps, memo } from 'react';

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
    const offsetMultipleMonths = numMonths === 1 ? 4 : 0;
    return (
      <View
        style={{ marginLeft: 200 + 5 - offsetMultipleMonths, flexShrink: 0 }}
      >
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
