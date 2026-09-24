import type { ComponentProps, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useSearchParams } from 'react-router';

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
  DashboardDateScope,
  DashboardWidgetEntity,
  RuleConditionEntity,
  TimeFrame,
} from '@actual-app/core/types/models';
import type { SyncedPrefs } from '@actual-app/core/types/prefs';

import { AppliedFilters } from '#components/filters/AppliedFilters';
import { FilterButton } from '#components/filters/FiltersMenu';
import { getFirstDayOfWeek } from '#components/select/getFirstDayOfWeek';
import { useDashboardReportTimeRange } from '#hooks/useDashboardReportTimeRange';
import { useDashboardWidget } from '#hooks/useDashboardWidget';
import { useDateFormat } from '#hooks/useDateFormat';
import { useLanguage, useLocale } from '#hooks/useLocale';

import { buildDateRangePresets } from './dateRangePresets';
import { calculateTimeRange } from './reportRanges';

type HeaderProps = {
  start: TimeFrame['start'];
  end: TimeFrame['end'];
  mode?: TimeFrame['mode'];
  show1Month?: boolean;
  showFutureRange?: boolean;
  hideModeToggle?: boolean;
  preserveRangeOnModeChange?: boolean;
  contentPadding?: number;
  resolvedTimeFrame?: DashboardDateScope;
  dateRangeLabel?: string;
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
  preserveRangeOnModeChange,
  contentPadding,
  resolvedTimeFrame,
  dateRangeLabel,
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
  const locale = useLocale();
  const dateFormat = useDateFormat() || 'MM/dd/yyyy';
  const [searchParams] = useSearchParams();
  const routeParams = useParams();
  const dashboardWidgetId =
    searchParams.get('dashboardWidget') ?? routeParams.id;
  const { data: dashboardChild } = useDashboardWidget<DashboardWidgetEntity>({
    id: resolvedTimeFrame ? undefined : (dashboardWidgetId ?? undefined),
  });
  const {
    dashboardScope,
    hasDashboardContext,
    isUsingDashboardRange: useDashboardDateRange,
    setUseDashboardDateRange,
  } = useDashboardReportTimeRange(dashboardChild);
  const canUseDashboardDateRange = Boolean(
    !resolvedTimeFrame &&
    hasDashboardContext &&
    dashboardChild &&
    dashboardChild.type !== 'formula-card',
  );
  const [displayStart, displayEnd, displayMode] = resolvedTimeFrame
    ? [resolvedTimeFrame.start, resolvedTimeFrame.end, resolvedTimeFrame.mode]
    : useDashboardDateRange
      ? [dashboardScope!.start, dashboardScope!.end, dashboardScope!.mode]
      : hasDashboardContext && mode !== 'static'
        ? calculateTimeRange(
            { start, end, mode },
            undefined,
            latestTransaction,
            dashboardScope!.end,
          )
        : [start, end, mode];
  const liveReferenceDate =
    hasDashboardContext && !useDashboardDateRange && displayMode !== 'static'
      ? dashboardScope!.end
      : undefined;
  const liveReferenceMonth = liveReferenceDate
    ? monthUtils.getMonth(liveReferenceDate)
    : undefined;
  const commitDates = (
    newStart: string,
    newEnd: string,
    newMode: TimeFrame['mode'],
  ) => {
    if (
      resolvedTimeFrame ||
      !useDashboardDateRange ||
      canUseDashboardDateRange
    ) {
      onChangeDates(newStart, newEnd, newMode);
    }
  };
  const selectWidgetTimeframe = () => {
    if (useDashboardDateRange && dashboardChild) {
      setUseDashboardDateRange(false);
    }
  };
  const modeLabel = useDashboardDateRange
    ? t('Dashboard')
    : displayMode === 'static'
      ? t('Static')
      : t('Live');

  const presets: DateRangePreset[] = buildDateRangePresets({
    t,
    onSelectRange: range => commitDates(...range),
    earliestTransaction,
    latestTransaction,
    show1Month,
    showFutureRange,
    includeAllTime: allMonths.length > 0,
    firstDayOfWeekIdx,
    referenceDate: liveReferenceDate,
  });

  return (
    <View
      style={{
        padding: contentPadding ?? 20,
        paddingTop: contentPadding == null ? 15 : 4,
        paddingBottom: contentPadding == null ? 20 : 4,
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
          {displayMode && !hideModeToggle && (
            <Button
              variant={
                useDashboardDateRange || displayMode !== 'static'
                  ? 'primary'
                  : 'normal'
              }
              onPress={() => {
                if (useDashboardDateRange) {
                  selectWidgetTimeframe();
                  return;
                }

                if (mode === 'static' && canUseDashboardDateRange) {
                  setUseDashboardDateRange(true);
                  return;
                }

                selectWidgetTimeframe();
                const newMode = mode === 'static' ? 'sliding-window' : 'static';
                const [newStart, newEnd] =
                  newMode === 'static'
                    ? [displayStart, displayEnd]
                    : preserveRangeOnModeChange
                      ? [start, end]
                      : calculateTimeRange({ start, end, mode: newMode });

                commitDates(newStart, newEnd, newMode);
              }}
            >
              {modeLabel}
            </Button>
          )}

          <DateRangePicker
            start={displayStart}
            end={displayEnd}
            referenceMonth={liveReferenceMonth}
            referenceHint={
              liveReferenceMonth
                ? t('Live ranges use {{month}} as the reference month.', {
                    month: monthUtils.format(
                      liveReferenceMonth,
                      'MMMM yyyy',
                      locale,
                    ),
                  })
                : undefined
            }
            isDisabled={useDashboardDateRange}
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
                : liveReferenceMonth &&
                    (!allMonths.length ||
                      liveReferenceMonth > allMonths[0].name)
                  ? liveReferenceMonth
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
              dateRange: dateRangeLabel ?? t('Date range'),
            }}
            presets={presets}
            onChangeDates={(newStart, newEnd) =>
              commitDates(newStart, newEnd, 'static')
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
