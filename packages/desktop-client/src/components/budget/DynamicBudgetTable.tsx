// @ts-strict-ignore
import React, { forwardRef, useEffect, type ComponentProps } from 'react';
import AutoSizer from 'react-virtualized-auto-sizer';

import { useActions } from '../../hooks/useActions';
import { useCategories } from '../../hooks/useCategories';
import { useLocalPrefs } from '../../hooks/useLocalPrefs';
import { View } from '../common/View';

import { useBudgetMonthCount } from './BudgetMonthCountContext';
import { BudgetPageHeader } from './BudgetPageHeader';
import { BudgetTable } from './BudgetTable';

function getNumPossibleMonths(width: number) {
  const estimatedTableWidth = width - 200;

  if (estimatedTableWidth < 500) {
    return 1;
  } else if (estimatedTableWidth < 750) {
    return 2;
  } else if (estimatedTableWidth < 1000) {
    return 3;
  } else if (estimatedTableWidth < 1250) {
    return 4;
  } else if (estimatedTableWidth < 1500) {
    return 5;
  }

  return 6;
}

type DynamicBudgetTableInnerProps = {
  width: number;
  height: number;
} & ComponentProps<typeof BudgetTable>;

const DynamicBudgetTableInner = forwardRef<
  BudgetTable,
  DynamicBudgetTableInnerProps
>(
  (
    {
      width,
      height,
      prewarmStartMonth,
      startMonth,
      maxMonths = 3,
      monthBounds,
      onMonthSelect: onMonthSelect_,
      onPreload,
      ...props
    },
    ref,
  ) => {
    const { grouped: categoryGroups } = useCategories();
    const prefs = useLocalPrefs();
    const { setDisplayMax } = useBudgetMonthCount();
    const actions = useActions();

    const numPossible = getNumPossibleMonths(width);
    const numMonths = Math.min(numPossible, maxMonths);
    const maxWidth = 200 + 500 * numMonths;

    useEffect(() => {
      setDisplayMax(numPossible);
    }, [numPossible]);

    function onMonthSelect(month) {
      onMonthSelect_(month, numMonths);
    }

    return (
      <View
        style={{
          width,
          height,
          alignItems: 'center',
          opacity: width <= 0 || height <= 0 ? 0 : 1,
        }}
      >
        <View style={{ width: '100%', maxWidth }}>
          <BudgetPageHeader
            startMonth={prewarmStartMonth}
            numMonths={numMonths}
            monthBounds={monthBounds}
            onMonthSelect={onMonthSelect}
          />
          <BudgetTable
            ref={ref}
            categoryGroups={categoryGroups}
            prewarmStartMonth={prewarmStartMonth}
            startMonth={startMonth}
            numMonths={numMonths}
            monthBounds={monthBounds}
            prefs={prefs}
            {...actions}
            {...props}
          />
        </View>
      </View>
    );
  },
);

export const DynamicBudgetTable = forwardRef<
  BudgetTable,
  DynamicBudgetTableInnerProps
>((props, ref) => {
  return (
    <AutoSizer>
      {({ width, height }) => (
        <DynamicBudgetTableInner
          ref={ref}
          width={width}
          height={height}
          {...props}
        />
      )}
    </AutoSizer>
  );
});
