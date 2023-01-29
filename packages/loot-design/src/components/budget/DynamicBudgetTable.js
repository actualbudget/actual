import React, { useEffect } from 'react';
import AutoSizer from 'react-virtualized-auto-sizer';

import { View } from '../common';

import { useBudgetMonthCount } from './BudgetMonthCountContext';
import { CategoryGroupsContext } from './util';

import { BudgetPageHeader, BudgetTable } from './index';

function getNumPossibleMonths(width) {
  let estimatedTableWidth = width - 200;

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

const DynamicBudgetTableInner = React.forwardRef(
  (
    {
      width,
      height,
      categoryGroups,
      prewarmStartMonth,
      startMonth,
      maxMonths = 3,
      monthBounds,
      onMonthSelect: onMonthSelect_,
      onPreload,
      ...props
    },
    ref
  ) => {
    let { setDisplayMax } = useBudgetMonthCount();

    let numPossible = getNumPossibleMonths(width);
    let numMonths = Math.min(numPossible, maxMonths);
    let maxWidth = 200 + 500 * numMonths;

    useEffect(() => {
      setDisplayMax(numPossible);
    }, [numPossible]);

    function onMonthSelect(month) {
      onMonthSelect_(month, numMonths);
    }

    return (
      <CategoryGroupsContext.Provider value={categoryGroups}>
        <View
          style={{
            width,
            height,
            alignItems: 'center',
            opacity: width <= 0 || height <= 0 ? 0 : 1
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
              {...props}
            />
          </View>
        </View>
      </CategoryGroupsContext.Provider>
    );
  }
);

export default React.forwardRef((props, ref) => {
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
