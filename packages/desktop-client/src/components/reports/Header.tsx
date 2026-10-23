import { useRef, useState } from 'react';
import type { ComponentProps, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { DateRangePicker } from '@actual-app/components/date-range-picker';
import type {
  DateRangeGranularity,
  DateRangePreset,
} from '@actual-app/components/date-range-picker';
import { useResponsive } from '@actual-app/components/hooks/useResponsive';
import { Menu } from '@actual-app/components/menu';
import { Popover } from '@actual-app/components/popover';
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
import { getFirstDayOfWeek } from '#components/select/getFirstDayOfWeek';
import { useDateFormat } from '#hooks/useDateFormat';
import { useLanguage } from '#hooks/useLocale';

import { buildDateRangePresets } from './dateRangePresets';
import { calculateTimeRange } from './reportRanges';

type HeaderProps = {
  start: TimeFrame['start'];
  end: TimeFrame['end'];
  mode?: TimeFrame['mode'];
  show1Month?: boolean;
  showFutureRange?: boolean;
  hideModeToggle?: boolean;
  // Offers a third mode next to static/live that pins the start date and lets
  // the range always end today.
  showUntilTodayMode?: boolean;
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
  showUntilTodayMode,
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

  const presets: DateRangePreset[] = buildDateRangePresets({
    t,
    onSelectRange: range => onChangeDates(...range),
    earliestTransaction,
    latestTransaction,
    show1Month,
    showFutureRange,
    includeAllTime: allMonths.length > 0,
    firstDayOfWeekIdx,
  });

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
          {mode &&
            !hideModeToggle &&
            (showUntilTodayMode ? (
              <TimeFrameModeSelector
                mode={mode}
                onChange={newMode => {
                  const [newStart, newEnd] = calculateTimeRange({
                    start,
                    end,
                    mode: newMode,
                  });

                  onChangeDates(newStart, newEnd, newMode);
                }}
              />
            ) : (
              <Button
                variant={mode === 'static' ? 'normal' : 'primary'}
                onPress={() => {
                  const newMode =
                    mode === 'static' ? 'sliding-window' : 'static';
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
            ))}

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
              // Picking a new start keeps an "until today" range live; moving
              // the end away from today pins the whole range.
              onChangeDates(
                newStart,
                newEnd,
                mode === 'until-today' && newEnd === end
                  ? 'until-today'
                  : 'static',
              )
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

type TimeFrameModeSelectorProps = {
  mode: TimeFrame['mode'];
  onChange: (mode: TimeFrame['mode']) => void;
};

function TimeFrameModeSelector({ mode, onChange }: TimeFrameModeSelectorProps) {
  const { t } = useTranslation();

  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const options: Array<{ name: TimeFrame['mode']; text: string }> = [
    { name: 'sliding-window', text: t('Live') },
    { name: 'until-today', text: t('Until today') },
    { name: 'static', text: t('Static') },
  ];

  // Preset ranges (e.g. last month) are live ranges too.
  const currentLabel =
    options.find(option => option.name === mode)?.text ?? t('Live');

  return (
    <>
      <Button
        ref={triggerRef}
        variant={mode === 'static' ? 'normal' : 'primary'}
        aria-label={t('Change date range mode')}
        onPress={() => setIsOpen(true)}
      >
        {currentLabel}
      </Button>

      <Popover
        triggerRef={triggerRef}
        placement="bottom start"
        isOpen={isOpen}
        onOpenChange={() => setIsOpen(false)}
      >
        <Menu
          onMenuSelect={item => {
            onChange(item as TimeFrame['mode']);
            setIsOpen(false);
          }}
          items={options}
        />
      </Popover>
    </>
  );
}
