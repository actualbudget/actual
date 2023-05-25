import React, { forwardRef, useEffect, useState } from 'react';
import AutoSizer from 'react-virtualized-auto-sizer';

import { View } from '../common';

import { useBudgetMonthCount } from './BudgetMonthCountContext';
import { BudgetPageHeader, BudgetTable } from './misc';
import { CategoryGroupsContext } from './util';

function getNumPossibleMonths(width, wideCategories) {
  let estimatedTableWidth = width - (wideCategories ? 250 : 150);

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

const DynamicBudgetTableInner = forwardRef(
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
    ref,
  ) => {
    let { setDisplayMax } = useBudgetMonthCount();

    const [wideCategories, setWideCategories] = useState(false);

    function toggleWideCategories() {
      setWideCategories(prev => !prev);
    }

    let numPossible = getNumPossibleMonths(width, wideCategories);
    let numMonths = Math.min(numPossible, maxMonths);
    let maxWidth = (wideCategories ? 250 : 150) + 500 * numMonths;

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
            opacity: width <= 0 || height <= 0 ? 0 : 1,
          }}
        >
          <View style={{ width: '100%', maxWidth }}>
            <BudgetPageHeader
              startMonth={prewarmStartMonth}
              numMonths={numMonths}
              monthBounds={monthBounds}
              onMonthSelect={onMonthSelect}
              wideCategories={wideCategories}
            />
            <BudgetTable
              ref={ref}
              categoryGroups={categoryGroups}
              prewarmStartMonth={prewarmStartMonth}
              startMonth={startMonth}
              numMonths={numMonths}
              monthBounds={monthBounds}
              wideCategories={wideCategories}
              onToggleWideCategories={toggleWideCategories}
              {...props}
            />
          </View>
        </View>
      </CategoryGroupsContext.Provider>
    );
  },
);

export default forwardRef((props, ref) => {
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
