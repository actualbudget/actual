import type { DateRangePreset } from '@actual-app/components/date-range-picker';
import * as monthUtils from '@actual-app/core/shared/months';
import type { TimeFrame } from '@actual-app/core/types/models';
import type { SyncedPrefs } from '@actual-app/core/types/prefs';

import { getLiveRange } from './getLiveRange';
import { clampMonthRangeToBounds } from './monthRange';
import {
  getFullFutureRange,
  getFullRange,
  getLatestRange,
  getNextRange,
} from './reportRanges';

type PresetRange = readonly [string, string, TimeFrame['mode']];

type BuildDateRangePresetsOptions = {
  t: (text: string) => string;
  onSelectRange: (range: PresetRange) => void;
  earliestTransaction: string;
  latestTransaction: string;
  show1Month?: boolean;
  showFutureRange?: boolean;
  includeAllTime?: boolean;
  firstDayOfWeekIdx?: SyncedPrefs['firstDayOfWeekIdx'];
};

function liveRangeAsMonths(
  rangeName: string,
  includeCurrentInterval: boolean,
  mode: TimeFrame['mode'],
  earliestTransaction: string,
  latestTransaction: string,
  firstDayOfWeekIdx?: SyncedPrefs['firstDayOfWeekIdx'],
): PresetRange {
  const [rangeStart, rangeEnd] = getLiveRange(
    rangeName,
    earliestTransaction,
    latestTransaction,
    includeCurrentInterval,
    firstDayOfWeekIdx,
  );

  return [monthUtils.getMonth(rangeStart), monthUtils.getMonth(rangeEnd), mode];
}

function makePreset(
  key: string,
  label: string,
  getRange: () => PresetRange,
  onSelectRange: (range: PresetRange) => void,
): DateRangePreset {
  return {
    key,
    label,
    getRange: () => {
      const [rangeStart, rangeEnd] = getRange();
      return [rangeStart, rangeEnd];
    },
    onSelect: () => {
      onSelectRange(getRange());
    },
  };
}

export function buildDateRangePresets({
  t,
  onSelectRange,
  earliestTransaction,
  latestTransaction,
  show1Month = false,
  showFutureRange = false,
  includeAllTime = true,
  firstDayOfWeekIdx,
}: BuildDateRangePresetsOptions): DateRangePreset[] {
  const earliestMonth = monthUtils.getMonth(earliestTransaction);
  const latestMonth = monthUtils.getMonth(latestTransaction);

  if (showFutureRange) {
    return [
      ...(show1Month
        ? [
            makePreset(
              'next-month',
              t('Next month'),
              () => getNextRange(0),
              onSelectRange,
            ),
          ]
        : []),
      makePreset(
        'next-3-months',
        t('Next 3 months'),
        () => getNextRange(2),
        onSelectRange,
      ),
      makePreset(
        'next-6-months',
        t('Next 6 months'),
        () => getNextRange(5),
        onSelectRange,
      ),
      makePreset(
        'next-year',
        t('Next year'),
        () => getNextRange(11),
        onSelectRange,
      ),
      makePreset(
        'all-future',
        t('All future'),
        () => getFullFutureRange(latestMonth),
        onSelectRange,
      ),
    ];
  }

  return [
    ...(show1Month
      ? [
          makePreset(
            '1-month',
            t('1 month'),
            () => getLatestRange(0),
            onSelectRange,
          ),
        ]
      : []),
    makePreset(
      '3-months',
      t('3 months'),
      () => getLatestRange(2),
      onSelectRange,
    ),
    makePreset(
      '6-months',
      t('6 months'),
      () => getLatestRange(5),
      onSelectRange,
    ),
    makePreset('1-year', t('1 year'), () => getLatestRange(11), onSelectRange),
    makePreset(
      'year-to-date',
      t('Year to date'),
      () =>
        liveRangeAsMonths(
          'Year to date',
          true,
          'yearToDate',
          earliestTransaction,
          latestTransaction,
          firstDayOfWeekIdx,
        ),
      onSelectRange,
    ),
    makePreset(
      'last-month',
      t('Last month'),
      () =>
        liveRangeAsMonths(
          'Last month',
          false,
          'lastMonth',
          earliestTransaction,
          latestTransaction,
          firstDayOfWeekIdx,
        ),
      onSelectRange,
    ),
    makePreset(
      'last-year',
      t('Last year'),
      () =>
        liveRangeAsMonths(
          'Last year',
          false,
          'lastYear',
          earliestTransaction,
          latestTransaction,
          firstDayOfWeekIdx,
        ),
      onSelectRange,
    ),
    makePreset(
      'prior-year-to-date',
      t('Prior year to date'),
      () =>
        liveRangeAsMonths(
          'Prior year to date',
          false,
          'priorYearToDate',
          earliestTransaction,
          latestTransaction,
          firstDayOfWeekIdx,
        ),
      onSelectRange,
    ),
    makePreset(
      'current-quarter',
      t('Current quarter'),
      () => {
        const [start, end, mode] = liveRangeAsMonths(
          'Current quarter',
          false,
          'currentQuarter',
          earliestTransaction,
          latestTransaction,
          firstDayOfWeekIdx,
        );
        const [clampedStart, clampedEnd] = clampMonthRangeToBounds(
          start,
          end,
          earliestMonth,
          latestMonth,
        );
        return [clampedStart, clampedEnd, mode];
      },
      onSelectRange,
    ),
    makePreset(
      'previous-quarter',
      t('Previous quarter'),
      () =>
        liveRangeAsMonths(
          'Previous quarter',
          false,
          'previousQuarter',
          earliestTransaction,
          latestTransaction,
          firstDayOfWeekIdx,
        ),
      onSelectRange,
    ),
    ...(includeAllTime
      ? [
          makePreset(
            'all-time',
            t('All time'),
            () => getFullRange(earliestMonth, latestMonth),
            onSelectRange,
          ),
        ]
      : []),
  ];
}
