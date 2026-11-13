import * as monthUtils from '@actual-app/core/shared/months';

export function countFilteredMonths(
  startDate: string,
  endDate: string,
  filters: unknown[],
  conditionsOp: string,
): number {
  const months = monthUtils.rangeInclusive(startDate, endDate);
  const filter = conditionsOp === 'or' ? { $or: filters } : { $and: filters };

  // The report query bounds Monthly reports by month, so every day in each
  // month is eligible for the date filters, even if there are no transactions.
  return months.filter(month => {
    const daysInMonth = Number(monthUtils.lastDayOfMonth(month).slice(-2));
    for (let day = 1; day <= daysInMonth; day++) {
      const date = `${month}-${String(day).padStart(2, '0')}`;
      if (matchesDateFilter(date, filter) !== false) {
        return true;
      }
    }
    return false;
  }).length;
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
  const constraint = filter.date;
  if (typeof constraint === 'string') {
    return date === constraint;
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
