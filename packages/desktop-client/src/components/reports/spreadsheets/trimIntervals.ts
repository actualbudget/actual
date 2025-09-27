import {
  type GroupedEntity,
  type IntervalEntity,
} from 'loot-core/types/models';

const isEmptyInterval = (interval: IntervalEntity) =>
  interval.totalAssets === 0 &&
  interval.totalDebts === 0 &&
  interval.totalTotals === 0;

export function determineIntervalRange(
  data: GroupedEntity[],
  intervalData: IntervalEntity[],
  trimIntervals: boolean,
): { startIndex: number; endIndex: number } {
  if (!trimIntervals || intervalData.length === 0) {
    return { startIndex: 0, endIndex: intervalData.length - 1 };
  }

  let globalStartIndex = intervalData.length;
  let globalEndIndex = -1;

  // Check each group to find the earliest start and latest end of non-empty data
  data.forEach(item => {
    const startIndex = item.intervalData.findIndex(
      interval => !isEmptyInterval(interval),
    );

    if (startIndex !== -1) {
      globalStartIndex = Math.min(globalStartIndex, startIndex);

      // Find last non-empty interval for this group
      let endIndex = item.intervalData.length - 1;
      while (endIndex >= 0 && isEmptyInterval(item.intervalData[endIndex])) {
        endIndex--;
      }
      globalEndIndex = Math.max(globalEndIndex, endIndex);
    }
  });

  // Also check the main intervalData for any activity
  const mainStartIndex = intervalData.findIndex(
    interval => !isEmptyInterval(interval),
  );
  if (mainStartIndex !== -1) {
    globalStartIndex = Math.min(globalStartIndex, mainStartIndex);

    let mainEndIndex = intervalData.length - 1;
    while (mainEndIndex >= 0 && isEmptyInterval(intervalData[mainEndIndex])) {
      mainEndIndex--;
    }
    globalEndIndex = Math.max(globalEndIndex, mainEndIndex);
  }

  // If no non-empty intervals found anywhere, return empty range
  if (globalStartIndex === intervalData.length || globalEndIndex === -1) {
    return { startIndex: 0, endIndex: -1 };
  }

  return { startIndex: globalStartIndex, endIndex: globalEndIndex };
}

export function trimIntervalDataToRange(
  data: IntervalEntity[],
  startIndex: number,
  endIndex: number,
): IntervalEntity[] {
  // Trim empty interval data from the start and end based on the range
  if (startIndex > endIndex || startIndex < 0 || endIndex >= data.length) {
    return [];
  }
  return data.slice(startIndex, endIndex + 1);
}

export function trimIntervalsToRange(
  data: GroupedEntity[],
  startIndex: number,
  endIndex: number,
): void {
  // Trims intervalData for each GroupedEntity based on range
  data.forEach(item => {
    if (
      startIndex > endIndex ||
      startIndex < 0 ||
      endIndex >= item.intervalData.length
    ) {
      item.intervalData = [];
    } else {
      item.intervalData = item.intervalData.slice(startIndex, endIndex + 1);
    }
  });
}

// Trim nested category intervalData within each group
export function trimGroupedDataIntervals(
  groupedData: GroupedEntity[],
  startIndex: number,
  endIndex: number,
): void {
  groupedData.forEach(group => {
    // Trim the group's own intervalData
    if (
      startIndex > endIndex ||
      startIndex < 0 ||
      endIndex >= group.intervalData.length
    ) {
      group.intervalData = [];
    } else {
      group.intervalData = group.intervalData.slice(startIndex, endIndex + 1);
    }

    // Trim the nested categories' intervalData
    if (group.categories) {
      group.categories.forEach(category => {
        if (
          startIndex > endIndex ||
          startIndex < 0 ||
          endIndex >= category.intervalData.length
        ) {
          category.intervalData = [];
        } else {
          category.intervalData = category.intervalData.slice(
            startIndex,
            endIndex + 1,
          );
        }
      });
    }
  });
}
