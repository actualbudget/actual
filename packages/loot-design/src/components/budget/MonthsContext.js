import React from 'react';

import * as monthUtils from 'loot-core/src/shared/months';

export function getValidMonthBounds(bounds, startMonth, endMonth) {
  return {
    start: startMonth < bounds.start ? bounds.start : startMonth,
    end: endMonth > bounds.end ? bounds.end : endMonth
  };
}

export let MonthsContext = React.createContext();

export function MonthsProvider({
  startMonth,
  numMonths,
  monthBounds,
  type,
  children
}) {
  let endMonth = monthUtils.addMonths(startMonth, numMonths - 1);
  let bounds = getValidMonthBounds(monthBounds, startMonth, endMonth);
  let months = monthUtils.rangeInclusive(bounds.start, bounds.end);

  return (
    <MonthsContext.Provider value={{ months, type }}>
      {children}
    </MonthsContext.Provider>
  );
}
