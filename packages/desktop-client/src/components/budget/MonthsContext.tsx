import React, { createContext, type ReactNode } from 'react';

import * as monthUtils from 'loot-core/src/shared/months';

type BoundsParams = {
  start: string | Date;
  end: string | Date;
};

type GetValidMonthBoundsParams = {
  bounds: BoundsParams;
  startMonth: string | Date;
  endMonth: string | Date;
};

export function getValidMonthBounds({ bounds, startMonth, endMonth }: GetValidMonthBoundsParams) {
  return {
    start: startMonth < bounds.start ? bounds.start : startMonth,
    end: endMonth > bounds.end ? bounds.end : endMonth,
  };
}

export let MonthsContext = createContext(null);

type MonthsProviderProps = {
  startMonth: string | Date;
  numMonths: number;
  monthBounds: BoundsParams;
  type: string;
  children?: ReactNode;
};

export function MonthsProvider({
  startMonth,
  numMonths,
  monthBounds,
  type,
  children,
}: MonthsProviderProps) {
  let endMonth = monthUtils.addMonths(startMonth, numMonths - 1);
  let bounds = getValidMonthBounds({ bounds: monthBounds, startMonth, endMonth });
  let months = monthUtils.rangeInclusive(bounds.start, bounds.end);

  return (
    <MonthsContext.Provider value={{ months, type }}>
      {children}
    </MonthsContext.Provider>
  );
}
