import React, { type CSSProperties, memo } from 'react';

import * as monthUtils from 'loot-core/src/shared/months';

import View from '../common/View';

import { MonthPicker } from './MonthPicker';
import { getScrollbarWidth } from './util';

type BudgetPageHeaderProps = {
  startMonth: string;
  onMonthSelect: (month: string) => string;
  numMonths: number;
  monthBounds: { start: string; end: string };
  style?: CSSProperties;
};

const BudgetPageHeader = memo(
  ({
    startMonth,
    onMonthSelect,
    numMonths,
    monthBounds,
    style,
  }: BudgetPageHeaderProps) => {
    function getValidMonth(month: string) {
      let start = monthBounds.start;
      let end = monthUtils.subMonths(monthBounds.end, numMonths - 1);

      if (month < start) {
        return start;
      } else if (month > end) {
        return end;
      }
      return month;
    }

    return (
      <View style={{ marginLeft: 200 + 5, flexShrink: 0 }}>
        <View style={{ marginRight: 5 + getScrollbarWidth() }}>
          <MonthPicker
            startMonth={startMonth}
            numDisplayed={numMonths}
            monthBounds={monthBounds}
            style={{ paddingTop: 5 }}
            onSelect={month => onMonthSelect(getValidMonth(month))}
          />
        </View>
      </View>
    );
  },
);

export default BudgetPageHeader;
