import type { ComponentProps, ReactNode } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { DateRangePicker } from '@actual-app/components/date-range-picker';
import type {
  DateRangeGranularity,
  DateRangePreset,
} from '@actual-app/components/date-range-picker';
import { useResponsive } from '@actual-app/components/hooks/useResponsive';
import { SpaceBetween } from '@actual-app/components/space-between';
import { View } from '@actual-app/components/view';
import * as monthUtils from '@actual-app/core/shared/months';
import type {
  RuleConditionEntity,
  TimeFrame,
} from '@actual-app/core/types/models';
import type { SyncedPrefs } from '@actual-app/core/types/prefs';

import { AppliedFilters } from '#components/filters/AppliedFilters';
import { FilterButton } from '#components/filters/FiltersMenu';
import { getFirstDayOfWeek } from '#components/select/DateSelect';
import { useDateFormat } from '#hooks/useDateFormat';
import { useLanguage } from '#hooks/useLocale';

import { getLiveRange } from './getLiveRange';
import {
  calculateTimeRange,
  getFullFutureRange,
  getFullRange,
  getLatestRange,
  getNextRange,
} from './reportRanges';

type HeaderProps = {
  start: TimeFrame['start'];
  end: TimeFrame['end'];
  mode?: TimeFrame['mode'];
  show1Month?: boolean;
  showFutureRange?: boolean;
  hideModeToggle?: boolean;
  allMonths: Array<{ name: string }>;
  earliestTransaction: string;
  latestTransaction: string;
  firstDayOfWeekIdx?: SyncedPrefs['firstDayOfWeekIdx'];
  onChangeDates: (
    start: TimeFrame['start'],
    end: TimeFrame['end'],
    mode: TimeFrame['mode'],
  ) => void;
  // Granularities the picker offers; defaults to month-only. In day mode the
  // picker emits `yyyy-MM-dd` start/end.
  granularities?: DateRangeGranularity[];
  children?: ReactNode;
  inlineContent?: ReactNode;
  // no separate category filter; use main filters instead
  filterExclude?: string[];
  filterInclude?: string[];
} & (
  | {
      filters: RuleConditionEntity[];
      onApply: (conditions: RuleConditionEntity) => void;
      onUpdateFilter: ComponentProps<typeof AppliedFilters>['onUpdate'];
      onDeleteFilter: ComponentProps<typeof AppliedFilters>['onDelete'];
      conditionsOp: 'and' | 'or';
      onConditionsOpChange: ComponentProps<
        typeof AppliedFilters
      >['onConditionsOpChange'];
    }
  | {
      filters?: never;
      onApply?: never;
      onUpdateFilter?: never;
      onDeleteFilter?: never;
      conditionsOp?: never;
      onConditionsOpChange?: never;
    }
);

export function Header({
  start,
  end,
  mode,
  show1Month,
  showFutureRange,
  hideModeToggle,
  allMonths,
  earliestTransaction,
  latestTransaction,
  firstDayOfWeekIdx,
  onChangeDates,
  filters,
  conditionsOp,
  onApply,
  onUpdateFilter,
  onDeleteFilter,
  onConditionsOpChange,
  granularities,
  children,
  inlineContent,
  filterExclude,
  filterInclude,
}: HeaderProps) {
  const { t } = useTranslation();
  const { isNarrowWidth } = useResponsive();
  const language = useLanguage();
  const dateFormat = useDateFormat() || 'MM/dd/yyyy';

  // Live-range presets return day-shaped bounds; collapse them to months.
  function liveRangeAsMonths(
    rangeName: string,
    includeCurrentInterval: boolean,
    mode: TimeFrame['mode'],
  ): [string, string, TimeFrame['mode']] {
    const [rangeStart, rangeEnd] = getLiveRange(
      rangeName,
      earliestTransaction,
      latestTransaction,
      includeCurrentInterval,
      firstDayOfWeekIdx,
    );
    return [
      monthUtils.getMonth(rangeStart),
      monthUtils.getMonth(rangeEnd),
      mode,
    ];
  }

  // The picker previews the range via getRange while staying open, then
  // commits via onSelect on close so the preset's mode is preserved.
  function makePreset(
    key: string,
    label: ReactNode,
    getFullRange: () => readonly [string, string, TimeFrame['mode']],
  ): DateRangePreset {
    return {
      key,
      label,
      getRange: () => {
        const [rangeStart, rangeEnd] = getFullRange();
        return [rangeStart, rangeEnd];
      },
      onSelect: () => onChangeDates(...getFullRange()),
    };
  }

  const presets: DateRangePreset[] = showFutureRange
    ? [
        ...(show1Month
          ? [
              makePreset('next-month', <Trans>Next month</Trans>, () =>
                getNextRange(0),
              ),
            ]
          : []),
        makePreset('next-3-months', <Trans>Next 3 months</Trans>, () =>
          getNextRange(2),
        ),
        makePreset('next-6-months', <Trans>Next 6 months</Trans>, () =>
          getNextRange(5),
        ),
        makePreset('next-year', <Trans>Next year</Trans>, () =>
          getNextRange(11),
        ),
        makePreset('all-future', <Trans>All future</Trans>, () =>
          getFullFutureRange(latestTransaction),
        ),
      ]
    : [
        ...(show1Month
          ? [
              makePreset('1-month', <Trans>1 month</Trans>, () =>
                getLatestRange(0),
              ),
            ]
          : []),
        makePreset('3-months', <Trans>3 months</Trans>, () =>
          getLatestRange(2),
        ),
        makePreset('6-months', <Trans>6 months</Trans>, () =>
          getLatestRange(5),
        ),
        makePreset('1-year', <Trans>1 year</Trans>, () => getLatestRange(11)),
        makePreset('year-to-date', <Trans>Year to date</Trans>, () =>
          liveRangeAsMonths('Year to date', true, 'yearToDate'),
        ),
        makePreset('last-month', <Trans>Last month</Trans>, () =>
          liveRangeAsMonths('Last month', false, 'lastMonth'),
        ),
        makePreset('last-year', <Trans>Last year</Trans>, () =>
          liveRangeAsMonths('Last year', false, 'lastYear'),
        ),
        makePreset(
          'prior-year-to-date',
          <Trans>Prior year to date</Trans>,
          () =>
            liveRangeAsMonths('Prior year to date', false, 'priorYearToDate'),
        ),
        // `allMonths` may still be empty before the report's async load
        // finishes.
        ...(allMonths.length
          ? [
              makePreset('all-time', <Trans>All time</Trans>, () =>
                getFullRange(
                  allMonths[allMonths.length - 1].name,
                  allMonths[0].name,
                ),
              ),
            ]
          : []),
      ];

  return (
    <View
      style={{
        padding: 20,
        paddingTop: 15,
        flexShrink: 0,
      }}
    >
      <View
        style={{
          display: 'grid',
          alignItems: isNarrowWidth ? 'flex-start' : 'center',
        }}
      >
        <SpaceBetween gap={isNarrowWidth ? 5 : undefined}>
          {mode && !hideModeToggle && (
            <Button
              variant={mode === 'static' ? 'normal' : 'primary'}
              onPress={() => {
                const newMode = mode === 'static' ? 'sliding-window' : 'static';
                const [newStart, newEnd] = calculateTimeRange({
                  start,
                  end,
                  mode: newMode,
                });

                onChangeDates(newStart, newEnd, newMode);
              }}
            >
              {mode === 'static' ? t('Static') : t('Live')}
            </Button>
          )}

          <DateRangePicker
            start={start}
            end={end}
            granularities={granularities}
            // allMonths is newest-first and may be empty before reports load.
            minDate={
              allMonths.length
                ? allMonths[allMonths.length - 1].name
                : monthUtils.currentMonth()
            }
            maxDate={
              showFutureRange
                ? undefined
                : allMonths.length
                  ? allMonths[0].name
                  : monthUtils.currentMonth()
            }
            firstDayOfWeek={getFirstDayOfWeek(firstDayOfWeekIdx)}
            locale={language}
            formatDayLabel={date => monthUtils.format(date, dateFormat)}
            labels={{
              selectBy: t('Select by'),
              quickSelect: t('Quick select'),
              month: t('Month'),
              day: t('Day'),
              previous: t('Previous'),
              next: t('Next'),
              previousMonth: t('Previous month'),
              nextMonth: t('Next month'),
              year: t('Year'),
              dateRange: t('Date range'),
            }}
            presets={presets}
            onChangeDates={(newStart, newEnd) =>
              onChangeDates(newStart, newEnd, 'static')
            }
          />
          {filters && (
            <FilterButton
              compact={isNarrowWidth}
              onApply={onApply}
              hover={false}
              exclude={filterExclude}
              include={filterInclude}
            />
          )}
          {inlineContent}
        </SpaceBetween>

        {children && (
          <SpaceBetween
            gap={isNarrowWidth ? 5 : undefined}
            style={{
              gridColumn: 2,
              justifySelf: 'flex-end',
              alignSelf: 'flex-start',
            }}
          >
            {children}
          </SpaceBetween>
        )}
      </View>

      {filters && filters.length > 0 && (
        <View style={{ marginTop: 5 }}>
          <AppliedFilters
            conditions={filters}
            onUpdate={onUpdateFilter}
            onDelete={onDeleteFilter}
            conditionsOp={conditionsOp}
            onConditionsOpChange={onConditionsOpChange}
          />
        </View>
      )}
    </View>
  );
}
