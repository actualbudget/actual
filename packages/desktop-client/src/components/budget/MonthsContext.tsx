import React, { createContext, type ReactNode } from 'react';

import * as monthUtils from 'loot-core/src/shared/months';

type BoundsProps = {
  start: string;
  end: string;
};

// eslint-disable-next-line import/no-unused-modules
export function getValidMonthBounds(
  bounds: BoundsProps,
  startMonth: undefined | string,
  endMonth: string,
) {
  return {
    start: startMonth < bounds.start ? bounds.start : startMonth,
    end: endMonth > bounds.end ? bounds.end : endMonth,
  };
}

type MonthsContextProps = {
  months: string[];
  type: string;
};

export let MonthsContext = createContext<MonthsContextProps>(null);

type MonthsProviderProps = {
  startMonth: string | undefined;
  numMonths: number;
  monthBounds: BoundsProps;
  type: string;
  children: ReactNode;
};

// eslint-disable-next-line import/no-unused-modules
export function MonthsProvider({
  startMonth,
  numMonths,
  monthBounds,
  type,
  children,
}: MonthsProviderProps) {
  let endMonth = monthUtils.addMonths(startMonth, numMonths - 1);
  let bounds = getValidMonthBounds(monthBounds, startMonth, endMonth);
  let months = monthUtils.rangeInclusive(bounds.start, bounds.end);

  return (
    <MonthsContext.Provider value={{ months, type }}>
      {children}
    </MonthsContext.Provider>
  );
}
