import { useRef, useState } from 'react';
import { Trans } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { useResponsive } from '@actual-app/components/hooks/useResponsive';
import { Popover } from '@actual-app/components/popover';
import type { CSSProperties } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import {
  currentDay,
  currentMonth,
  firstDayOfMonth,
  format,
  getMonth,
  lastDayOfMonth,
} from '@actual-app/core/shared/months';
import type { SyncedPrefs } from '@actual-app/core/types/prefs';

import { useLocale } from '#hooks/useLocale';

import { GranularityToggle } from './month-range-picker/GranularityToggle';
import { RangeSelector } from './month-range-picker/RangeSelector';
import { clamp, valueIsDay } from './month-range-picker/util';
import type {
  MonthRangeGranularity,
  QuickSelectPreset,
} from './month-range-picker/util';

export type {
  MonthRangeGranularity,
  QuickSelectPreset,
} from './month-range-picker/util';

type MonthRangePickerProps = {
  start: string;
  end: string;
  /** Inclusive lower bound (`yyyy-MM` or `yyyy-MM-dd`). */
  minDate: string;
  /** Inclusive upper bound; omit for no upper limit. */
  maxDate?: string;
  /** Pass `['month', 'day']` for reports that handle day-shaped values. */
  granularities?: MonthRangeGranularity[];
  presets?: QuickSelectPreset[];
  firstDayOfWeekIdx?: SyncedPrefs['firstDayOfWeekIdx'];
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

export function MonthRangePicker({
  start,
  end,
  minDate,
  maxDate,
  granularities = ['month'],
  presets,
  firstDayOfWeekIdx,
  onChangeDates,
}: MonthRangePickerProps) {
  const effectiveMax = maxDate ?? NO_MAX;
  const locale = useLocale();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const { isNarrowWidth } = useResponsive();

  const allowsDay = granularities.includes('day');
  const showGranularityToggle = allowsDay && granularities.includes('month');

  // Edit a local draft while open; the report only recomputes on commit. The
  // draft's shape encodes the granularity, so it survives the remounts that
  // reports with a loading early-return cause on every commit.
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

  function changeGranularity(next: MonthRangeGranularity) {
    if (next === (isDay ? 'day' : 'month')) return;
    // Only reshape the draft; committing here recomputes the report, which
    // can unmount the Header and close this popover. Commit happens on close.
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
  const labelFormat = valueIsDay(shownStart) ? 'P' : 'MMM yyyy';
  const label = `${format(shownStart, labelFormat, locale)} – ${format(
    shownEnd,
    labelFormat,
    locale,
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
            <RangeSelector
              // Remount on granularity switch so the click-anchor and view
              // month can't carry a month-shaped value into the day grid.
              key={isDay ? 'day' : 'month'}
              start={draftStart}
              end={draftEnd}
              min={isDay ? dayMin : monthMin}
              max={isDay ? dayMax : monthMax}
              isDay={isDay}
              locale={locale}
              firstDayOfWeekIdx={firstDayOfWeekIdx}
              onChange={setDraft}
            />
          </View>

          {hasSidebar && (
            <View style={{ padding: 15, minWidth: 140, gap: 16 }}>
              {showGranularityToggle && (
                <View>
                  <Text style={sectionTitleStyle}>
                    <Trans>Select by</Trans>
                  </Text>
                  <GranularityToggle
                    value={isDay ? 'day' : 'month'}
                    onChange={changeGranularity}
                  />
                </View>
              )}

              {Boolean(presets?.length) && (
                <View>
                  <Text style={sectionTitleStyle}>
                    <Trans>Quick select</Trans>
                  </Text>
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
