import * as monthUtils from '@actual-app/core/shared/months';
import { millisecondsInDay } from 'date-fns/constants';

import { getReportQueryDateTransform } from './makeQuery';

export function countFilteredIntervals(
  startDate: string,
  endDate: string,
  interval: string,
  intervals: string[],
  filters: unknown[],
  conditionsOp: string,
): number {
  const filter = conditionsOp === 'or' ? { $or: filters } : { $and: filters };
  const [firstDay, lastDay] = getQueryDayBounds(startDate, endDate, interval);
  const first = toUtcTimestamp(firstDay);
  const last = toUtcTimestamp(lastDay);
  const intervalStarts = intervals.map(start =>
    toUtcTimestamp(monthUtils.dayFromDate(start)),
  );

  // Use the report's interval boundaries, but only consider days inside the
  // transaction query's range. Step through calendar days in UTC so local
  // timezone transitions don't skip dates stored in the database.
  return intervalStarts.filter((intervalStart, index) => {
    const nextIntervalStart = intervalStarts[index + 1];
    for (
      let time = Math.max(intervalStart, first);
      time <= last &&
      (nextIntervalStart === undefined || time < nextIntervalStart);
      time += millisecondsInDay
    ) {
      const day = new Date(time).toISOString().slice(0, 10);
      if (matchesDateFilter(day, filter) !== false) {
        return true;
      }
    }
    return false;
  }).length;
}

function toUtcTimestamp(day: string): number {
  return Date.parse(`${day}T00:00:00Z`);
}

function getQueryDayBounds(
  startDate: string,
  endDate: string,
  interval: string,
): [string, string] {
  switch (getReportQueryDateTransform(interval)) {
    case '$year':
      return [
        monthUtils.firstDayOfMonth(monthUtils.getYearStart(startDate)),
        monthUtils.lastDayOfMonth(monthUtils.getYearEnd(endDate)),
      ];
    case '$month':
      return [
        monthUtils.firstDayOfMonth(startDate),
        monthUtils.lastDayOfMonth(endDate),
      ];
    default:
      return [
        monthUtils.dayFromDate(startDate),
        monthUtils.dayFromDate(endDate),
      ];
  }
}

// Use the date expressions produced by make-filters-from-conditions. Month,
// year and approximate matches are already expanded to date comparisons.
function matchesDateFilter(date: string, filter: unknown): boolean | undefined {
  if (!filter || typeof filter !== 'object') {
    return undefined;
  }
  if ('$and' in filter && Array.isArray(filter.$and)) {
    return filter.$and.every(
      condition => matchesDateFilter(date, condition) !== false,
    );
  }
  if ('$or' in filter && Array.isArray(filter.$or)) {
    // ActualQL ignores empty OR expressions.
    return filter.$or.length > 0
      ? filter.$or.some(
          condition => matchesDateFilter(date, condition) === true,
        )
      : undefined;
  }

  // The rule converter uses { id: null } for conditions that match no transactions.
  if ('id' in filter && filter.id === null) {
    return false;
  }

  // A condition on another field can match on any date.
  if (!('date' in filter)) {
    return true;
  }
  return matchesDateConstraint(date, filter.date);
}

function matchesDateConstraint(date: string, constraint: unknown): boolean {
  if (typeof constraint === 'string') {
    return date === constraint;
  }
  // ActualQL combines the bounds of an "is between" filter with AND.
  if (Array.isArray(constraint)) {
    return constraint.every(bound => matchesDateConstraint(date, bound));
  }
  if (!constraint || typeof constraint !== 'object') {
    return true;
  }

  const after = '$gt' in constraint ? constraint.$gt : undefined;
  const onOrAfter = '$gte' in constraint ? constraint.$gte : undefined;
  const before = '$lt' in constraint ? constraint.$lt : undefined;
  const onOrBefore = '$lte' in constraint ? constraint.$lte : undefined;
  return (
    (typeof after !== 'string' || date > after) &&
    (typeof onOrAfter !== 'string' || date >= onOrAfter) &&
    (typeof before !== 'string' || date < before) &&
    (typeof onOrBefore !== 'string' || date <= onOrBefore)
  );
}
