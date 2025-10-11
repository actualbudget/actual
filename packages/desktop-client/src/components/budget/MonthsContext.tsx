// @ts-strict-ignore
import React, { createContext, type ReactNode } from 'react';

import * as monthUtils from 'loot-core/shared/months';

export type MonthBounds = {
  start: string;
  end: string;
};

export function getValidMonthBounds(
  bounds: MonthBounds,
  startMonth: undefined | string,
  endMonth: string,
) {
  // Use the enhanced comparison functions that handle mixed month types safely
  try {
    return {
      start:
        startMonth && monthUtils.isBefore(startMonth, bounds.start)
          ? bounds.start
          : startMonth,
      end: monthUtils.isAfter(endMonth, bounds.end) ? bounds.end : endMonth,
    };
  } catch (error) {
    // If comparison fails due to mixed types, prefer start/end over bounds to maintain consistency
    if (error.message.includes('Cannot compare mixed month types')) {
      return {
        start: startMonth || bounds.start,
        end: endMonth,
      };
    }
    throw error; // Re-throw other errors
  }
}

type MonthsContextProps = {
  months: string[];
  type: string;
};

export const MonthsContext = createContext<MonthsContextProps>(null);

type MonthsProviderProps = {
  startMonth: string | undefined;
  numMonths: number;
  monthBounds: MonthBounds;
  type: string;
  children: ReactNode;
};

export function MonthsProvider({
  startMonth,
  numMonths,
  monthBounds,
  type,
  children,
}: MonthsProviderProps) {
  const endMonth = monthUtils.addMonths(startMonth, numMonths - 1);
  const bounds = getValidMonthBounds(monthBounds, startMonth, endMonth);

  const months = monthUtils.rangeInclusive(bounds.start, bounds.end);

  return (
    <MonthsContext.Provider value={{ months, type }}>
      {children}
    </MonthsContext.Provider>
  );
}
