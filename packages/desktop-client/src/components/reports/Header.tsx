import type { ComponentProps, ReactNode } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
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

import { getLiveRange } from './getLiveRange';
import { MonthRangePicker } from './MonthRangePicker';
import type {
  MonthRangeGranularity,
  QuickSelectPreset,
} from './MonthRangePicker';
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
  allMonths: Array<{ name: string; pretty: string }>;
  earliestTransaction: string;
  latestTransaction: string;
  firstDayOfWeekIdx?: SyncedPrefs['firstDayOfWeekIdx'];
  onChangeDates: (
    start: TimeFrame['start'],
    end: TimeFrame['end'],
    mode: TimeFrame['mode'],
    // Only meaningful for `mode: 'sliding-window'` — see `TimeFrame.endOffset`.
    endOffset?: number,
  ) => void;
  // Granularities the picker offers; defaults to both. In day mode the picker
  // emits `yyyy-MM-dd` start/end.
  granularities?: MonthRangeGranularity[];
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

type RangePresetProps = {
  show1Month?: boolean;
  earliestTransaction: string;
  latestTransaction: string;
  firstDayOfWeekIdx?: SyncedPrefs['firstDayOfWeekIdx'];
  allMonths: Array<{ name: string; pretty: string }>;
  onChangeDates: HeaderProps['onChangeDates'];
};

type PastRangePresetsProps = RangePresetProps & {
  convertToMonth: (
    start: string,
    end: string,
    currentMode: TimeFrame['mode'],
    mode: TimeFrame['mode'],
  ) => [string, string, TimeFrame['mode']];
};

type FutureRangePresetsProps = Pick<
  RangePresetProps,
  'show1Month' | 'latestTransaction' | 'onChangeDates'
>;

function getPastRangePresets({
  show1Month,
  earliestTransaction,
  latestTransaction,
  firstDayOfWeekIdx,
  allMonths,
  onChangeDates,
  convertToMonth,
}: PastRangePresetsProps): QuickSelectPreset[] {
  return [
    ...(show1Month
      ? [
          {
            key: '1-month',
            label: <Trans>1 month</Trans>,
            onSelect: () => onChangeDates(...getLatestRange(0)),
          },
        ]
      : []),
    {
      key: '3-months',
      label: <Trans>3 months</Trans>,
      onSelect: () => onChangeDates(...getLatestRange(2)),
    },
    {
      key: '6-months',
      label: <Trans>6 months</Trans>,
      onSelect: () => onChangeDates(...getLatestRange(5)),
    },
    {
      key: '1-year',
      label: <Trans>1 year</Trans>,
      onSelect: () => onChangeDates(...getLatestRange(11)),
    },
    {
      key: 'year-to-date',
      label: <Trans>Year to date</Trans>,
      onSelect: () =>
        onChangeDates(
          ...convertToMonth(
            ...getLiveRange(
              'Year to date',
              earliestTransaction,
              latestTransaction,
              true,
              firstDayOfWeekIdx,
            ),
            'yearToDate',
          ),
        ),
    },
    {
      key: 'last-month',
      label: <Trans>Last month</Trans>,
      onSelect: () =>
        onChangeDates(
          ...convertToMonth(
            ...getLiveRange(
              'Last month',
              earliestTransaction,
              latestTransaction,
              false,
              firstDayOfWeekIdx,
            ),
            'lastMonth',
          ),
        ),
    },
    {
      key: 'last-year',
      label: <Trans>Last year</Trans>,
      onSelect: () =>
        onChangeDates(
          ...convertToMonth(
            ...getLiveRange(
              'Last year',
              earliestTransaction,
              latestTransaction,
              false,
              firstDayOfWeekIdx,
            ),
            'lastYear',
          ),
        ),
    },
    {
      key: 'prior-year-to-date',
      label: <Trans>Prior year to date</Trans>,
      onSelect: () =>
        onChangeDates(
          ...convertToMonth(
            ...getLiveRange(
              'Prior year to date',
              earliestTransaction,
              latestTransaction,
              false,
              firstDayOfWeekIdx,
            ),
            'priorYearToDate',
          ),
        ),
    },
    {
      key: 'all-time',
      label: <Trans>All time</Trans>,
      onSelect: () =>
        onChangeDates(
          ...getFullRange(
            allMonths[allMonths.length - 1].name,
            allMonths[0].name,
          ),
        ),
    },
  ];
}

function getFutureRangePresets({
  show1Month,
  latestTransaction,
  onChangeDates,
}: FutureRangePresetsProps): QuickSelectPreset[] {
  return [
    ...(show1Month
      ? [
          {
            key: 'next-month',
            label: <Trans>Next month</Trans>,
            onSelect: () => onChangeDates(...getNextRange(0)),
          },
        ]
      : []),
    {
      key: 'next-3-months',
      label: <Trans>Next 3 months</Trans>,
      onSelect: () => onChangeDates(...getNextRange(2)),
    },
    {
      key: 'next-6-months',
      label: <Trans>Next 6 months</Trans>,
      onSelect: () => onChangeDates(...getNextRange(5)),
    },
    {
      key: 'next-year',
      label: <Trans>Next year</Trans>,
      onSelect: () => onChangeDates(...getNextRange(11)),
    },
    {
      key: 'all-future',
      label: <Trans>All future</Trans>,
      onSelect: () => onChangeDates(...getFullFutureRange(latestTransaction)),
    },
  ];
}

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

  function convertToMonth(
    start: string,
    end: string,
    _: TimeFrame['mode'],
    mode: TimeFrame['mode'],
  ): [string, string, TimeFrame['mode']] {
    return [monthUtils.getMonth(start), monthUtils.getMonth(end), mode];
  }

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
        <View
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            flexDirection: 'row',
          }}
        >
          <SpaceBetween gap={isNarrowWidth ? 5 : undefined}>
            {mode && !hideModeToggle && (
              <Button
                variant={mode === 'static' ? 'normal' : 'primary'}
                onPress={() => {
                  const newMode =
                    mode === 'static' ? 'sliding-window' : 'static';
                  const [newStart, newEnd, , newEndOffset] = calculateTimeRange(
                    {
                      start,
                      end,
                      mode: newMode,
                    },
                  );

                  onChangeDates(newStart, newEnd, newMode, newEndOffset);
                }}
              >
                {mode === 'static' ? t('Static') : t('Live')}
              </Button>
            )}

            <MonthRangePicker
              start={start}
              end={end}
              granularities={granularities}
              // Excluding the current month only makes sense for past ranges.
              allowExcludeCurrentMonth={!showFutureRange}
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
              firstDayOfWeekIdx={firstDayOfWeekIdx}
              presets={
                showFutureRange
                  ? getFutureRangePresets({
                      show1Month,
                      latestTransaction,
                      onChangeDates,
                    })
                  : getPastRangePresets({
                      show1Month,
                      earliestTransaction,
                      latestTransaction,
                      firstDayOfWeekIdx,
                      allMonths,
                      onChangeDates,
                      convertToMonth,
                    })
              }
              onChangeDates={(newStart, newEnd, endOffset) =>
                onChangeDates(newStart, newEnd, 'static', endOffset)
              }
            />
          </SpaceBetween>

          <SpaceBetween gap={3}>
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
        </View>

        {children && (
          <View
            style={{
              gridColumn: 2,
              flexDirection: 'row',
              justifySelf: 'flex-end',
              alignSelf: 'flex-start',
            }}
          >
            {children}
          </View>
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
