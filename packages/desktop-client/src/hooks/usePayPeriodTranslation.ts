import * as monthUtils from 'loot-core/shared/months';
import { isPayPeriod } from 'loot-core/shared/pay-periods';

export type DateRange = {
  start: string;
  end: string;
};

/**
 * Converts a pay period month to a date range
 * @param month Pay period month like '2024-13'
 * @returns Object with start and end dates in YYYY-MM-DD format
 */
export function convertPayPeriodToDateRange(month: string): DateRange {
  if (!isPayPeriod(month)) {
    throw new Error(`Invalid pay period month: ${month}`);
  }

  const bounds = monthUtils.bounds(month);

  // Convert from integer date format (YYYYMMDD) to string format (YYYY-MM-DD)
  const startStr = bounds.start.toString();
  const endStr = bounds.end.toString();

  const formatDate = (dateInt: string) => {
    // dateInt is like "20240105"
    const year = dateInt.slice(0, 4);
    const month = dateInt.slice(4, 6);
    const day = dateInt.slice(6, 8);
    return `${year}-${month}-${day}`;
  };

  return {
    start: formatDate(startStr),
    end: formatDate(endStr),
  };
}

/**
 * Automatically detects pay periods and creates appropriate filters
 * @param month Month string (calendar month like '2024-01' or pay period like '2024-13')
 * @param categoryId Category ID to filter by
 * @returns Array of filter conditions for transaction queries
 */
export function createTransactionFilterConditions(
  month: string,
  categoryId: string,
) {
  const baseConditions = [
    { field: 'category', op: 'is', value: categoryId, type: 'id' },
  ];

  if (isPayPeriod(month)) {
    // For pay periods, use date range filtering
    const dateRange = convertPayPeriodToDateRange(month);
    return [
      ...baseConditions,
      { field: 'date', op: 'gte', value: dateRange.start, type: 'date' },
      { field: 'date', op: 'lte', value: dateRange.end, type: 'date' },
    ];
  } else {
    // For calendar months, use the existing month filtering
    return [
      ...baseConditions,
      {
        field: 'date',
        op: 'is',
        value: month,
        options: { month: true },
        type: 'date',
      },
    ];
  }
}

/**
 * Creates a month-aware date filter that works with both calendar months and pay periods
 * @param month Month string (calendar month like '2024-01' or pay period like '2024-13')
 * @param categoryId Category ID to filter by
 * @returns AQL filter object with category and date filters
 */
export function createMonthDateFilter(month: string, categoryId: string) {
  if (isPayPeriod(month)) {
    // For pay periods, use date range filtering instead of $month transform
    const dateRange = convertPayPeriodToDateRange(month);
    return {
      category: categoryId,
      date: {
        $gte: dateRange.start,
        $lte: dateRange.end,
      },
    };
  } else {
    // For calendar months, use the existing $month transform
    return {
      category: categoryId,
      date: { $transform: '$month', $eq: month },
    };
  }
}
