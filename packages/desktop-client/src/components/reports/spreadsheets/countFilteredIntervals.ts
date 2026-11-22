import * as monthUtils from '@actual-app/core/shared/months';

export function countFilteredIntervals(
  startDate: string,
  endDate: string,
  interval: 'Monthly' | 'Quarterly',
  filters: unknown[],
  conditionsOp: string,
): number {
  const filter = conditionsOp === 'or' ? { $or: filters } : { $and: filters };

  // Both report queries bound the range by month, even when the results are
  // grouped by quarter. A covered month counts even if it has no transactions.
  const coveredMonths = monthUtils
    .rangeInclusive(startDate, endDate)
    .filter(month => {
      const daysInMonth = Number(monthUtils.lastDayOfMonth(month).slice(-2));
      for (let day = 1; day <= daysInMonth; day++) {
        const date = `${month}-${String(day).padStart(2, '0')}`;
        if (matchesDateFilter(date, filter) !== false) {
          return true;
        }
      }
      return false;
    });

  if (interval === 'Monthly') {
    return coveredMonths.length;
  }
  return new Set(coveredMonths.map(monthUtils.getQuarterStart)).size;
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
