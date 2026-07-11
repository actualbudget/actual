import { useRef, useState } from 'react';

import { Button } from '#Button';
import { useResponsive } from '#hooks/useResponsive';
import { Popover } from '#Popover';
import type { CSSProperties } from '#styles';
import { Text } from '#Text';
import { theme } from '#theme';
import { View } from '#View';

import { DayRangeCalendar } from './DayRangeCalendar';
import { GranularityToggle } from './GranularityToggle';
import { RangeSelector } from './RangeSelector';
import {
  clamp,
  currentDay,
  currentMonth,
  firstDayOfMonth,
  formatDate,
  getMonth,
  lastDayOfMonth,
  valueIsDay,
} from './util';
import type {
  DateRangeGranularity,
  DateRangePickerLabels,
  DateRangePreset,
  FirstDayOfWeek,
} from './util';

export type {
  DateRangeGranularity,
  DateRangePickerLabels,
  DateRangePreset,
  FirstDayOfWeek,
} from './util';

type DateRangePickerProps = {
  start: string;
  end: string;
  /** Inclusive lower bound (`yyyy-MM` or `yyyy-MM-dd`). */
  minDate: string;
  /** Inclusive upper bound; omit for no upper limit. */
  maxDate?: string;
  /** Pass `['month', 'day']` for callers that handle day-shaped values. */
  granularities?: DateRangeGranularity[];
  presets?: DateRangePreset[];
  firstDayOfWeek?: FirstDayOfWeek;
  /** BCP 47 language tag driving all date formatting. */
  locale: string;
  labels: DateRangePickerLabels;
  onChangeDates: (start: string, end: string) => void;
};

// Far-future sentinel: sorts after any real date string.
const NO_MAX = '9999-12-31';

const sectionTitleStyle = {
  fontWeight: 'bold',
  marginBottom: 8,
  fontSize: 12,
  textTransform: 'uppercase',
  color: theme.pageTextSubdued,
} satisfies CSSProperties;

export function DateRangePicker({
  start,
  end,
  minDate,
  maxDate,
  granularities = ['month'],
  presets,
  firstDayOfWeek = 'sun',
  locale,
  labels,
  onChangeDates,
}: DateRangePickerProps) {
  const effectiveMax = maxDate ?? NO_MAX;
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const { isNarrowWidth } = useResponsive();

  const allowsDay = granularities.includes('day');
  const showGranularityToggle = allowsDay && granularities.includes('month');

  // Edit a local draft while open; the caller only recomputes on commit. The
  // draft's shape encodes the granularity, so it survives the remounts that
  // callers with a loading early-return cause on every commit.
  const [draftStart, setDraftStart] = useState(start);
  const [draftEnd, setDraftEnd] = useState(end);
  const isDay = allowsDay && valueIsDay(draftStart);
  // Set when a preset already committed, so closing doesn't overwrite it.
  const skipCommitRef = useRef(false);

  // Normalize the bounds to each granularity once: month-shaped bounds widen
  // to whole months in day mode, day-shaped bounds stay exact. A month-shaped
  // cap that reaches the current month would otherwise widen to that month's
  // last day, allowing days after today.
  const monthMin = getMonth(minDate);
  const monthMax = getMonth(effectiveMax);
  const dayMin = valueIsDay(minDate) ? minDate : firstDayOfMonth(minDate);
  const dayMax =
    monthMax === currentMonth()
      ? currentDay()
      : valueIsDay(effectiveMax)
        ? effectiveMax
        : lastDayOfMonth(effectiveMax);

  function openPopover() {
    if (allowsDay && valueIsDay(start)) {
      setDraftStart(start);
      setDraftEnd(end);
    } else {
      setDraftStart(getMonth(start));
      setDraftEnd(getMonth(end));
    }
    skipCommitRef.current = false;
    setIsOpen(true);
  }

  function changeGranularity(next: DateRangeGranularity) {
    if (next === (isDay ? 'day' : 'month')) return;
    // Only reshape the draft; committing here recomputes the caller's view,
    // which can unmount this picker and close the popover. Commit on close.
    setDraftStart(
      next === 'day'
        ? clamp(firstDayOfMonth(draftStart), dayMin, dayMax)
        : getMonth(draftStart),
    );
    setDraftEnd(
      next === 'day'
        ? clamp(lastDayOfMonth(draftEnd), dayMin, dayMax)
        : getMonth(draftEnd),
    );
  }

  function closeAndCommit() {
    setIsOpen(false);
    if (skipCommitRef.current) {
      return;
    }
    skipCommitRef.current = true;
    if (draftStart !== start || draftEnd !== end) {
      onChangeDates(draftStart, draftEnd);
    }
  }

  const hasSidebar = showGranularityToggle || Boolean(presets?.length);

  function setDraft(nextStart: string, nextEnd: string) {
    // Keep the range ordered regardless of which grid the user clicked.
    if (nextStart > nextEnd) {
      [nextStart, nextEnd] = [nextEnd, nextStart];
    }
    setDraftStart(nextStart);
    setDraftEnd(nextEnd);
  }

  const shownStart = isOpen ? draftStart : start;
  const shownEnd = isOpen ? draftEnd : end;

  // Format by the values' actual shape; the committed values may be
  // day-shaped even when day mode is off.
  const labelFormat: Intl.DateTimeFormatOptions = valueIsDay(shownStart)
    ? { year: 'numeric', month: 'numeric', day: 'numeric' }
    : { month: 'short', year: 'numeric' };
  const label = `${formatDate(shownStart, locale, labelFormat)} – ${formatDate(
    shownEnd,
    locale,
    labelFormat,
  )}`;

  return (
    <View>
      <Button
        ref={triggerRef}
        onPress={() => (isOpen ? closeAndCommit() : openPopover())}
      >
        {label}
      </Button>

      <Popover
        triggerRef={triggerRef}
        placement="bottom start"
        isOpen={isOpen}
        onOpenChange={nextOpen => {
          if (!nextOpen) {
            closeAndCommit();
          }
        }}
        style={{ padding: 0 }}
      >
        <View style={{ flexDirection: isNarrowWidth ? 'column' : 'row' }}>
          <View
            style={{
              padding: 15,
              ...(hasSidebar &&
                (isNarrowWidth
                  ? { borderBottom: `1px solid ${theme.tableBorder}` }
                  : { borderRight: `1px solid ${theme.tableBorder}` })),
            }}
          >
            {isDay ? (
              <DayRangeCalendar
                start={draftStart}
                end={draftEnd}
                min={dayMin}
                max={dayMax}
                firstDayOfWeek={firstDayOfWeek}
                locale={locale}
                labels={labels}
                onChange={setDraft}
              />
            ) : (
              <RangeSelector
                start={draftStart}
                end={draftEnd}
                min={monthMin}
                max={monthMax}
                locale={locale}
                labels={labels}
                onChange={setDraft}
              />
            )}
          </View>

          {hasSidebar && (
            <View style={{ padding: 15, minWidth: 140, gap: 16 }}>
              {showGranularityToggle && (
                <View>
                  <Text style={sectionTitleStyle}>{labels.selectBy}</Text>
                  <GranularityToggle
                    value={isDay ? 'day' : 'month'}
                    monthLabel={labels.month}
                    dayLabel={labels.day}
                    onChange={changeGranularity}
                  />
                </View>
              )}

              {Boolean(presets?.length) && (
                <View>
                  <Text style={sectionTitleStyle}>{labels.quickSelect}</Text>
                  <View style={{ gap: 4 }}>
                    {presets?.map(preset => (
                      <Button
                        key={preset.key}
                        variant="bare"
                        onPress={() => {
                          skipCommitRef.current = true;
                          preset.onSelect();
                          setIsOpen(false);
                        }}
                        style={{ justifyContent: 'flex-start', fontSize: 13 }}
                      >
                        {preset.label}
                      </Button>
                    ))}
                  </View>
                </View>
              )}
            </View>
          )}
        </View>
      </Popover>
    </View>
  );
}
