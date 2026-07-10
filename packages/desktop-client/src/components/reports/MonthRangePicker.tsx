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
  currentMonth,
  differenceInCalendarMonths,
  format,
  prevMonth,
} from '@actual-app/core/shared/months';
import type { SyncedPrefs } from '@actual-app/core/types/prefs';

import { useLocale } from '#hooks/useLocale';

import { ExcludeCurrentMonthToggle } from './month-range-picker/ExcludeCurrentMonthToggle';
import { GranularityToggle } from './month-range-picker/GranularityToggle';
import { RangeSelector } from './month-range-picker/RangeSelector';
import {
  shiftMonths,
  toDayEnd,
  toDayStart,
  toMonth,
  valueIsDay,
} from './month-range-picker/util';
import type {
  MonthRangeGranularity,
  QuickSelectPreset,
} from './month-range-picker/util';

export {
  type MonthRangeGranularity,
  type QuickSelectPreset,
  valueIsDay,
} from './month-range-picker/util';

type MonthRangePickerProps = {
  start: string;
  end: string;
  /** Inclusive lower bound (`yyyy-MM` or `yyyy-MM-dd`). */
  minDate: string;
  /** Inclusive upper bound; omit for no upper limit. */
  maxDate?: string;
  /** Pass `['month']` for month-only reports to hide the Day toggle. */
  granularities?: MonthRangeGranularity[];
  /** Offer an "Exclude current month" checkbox that shifts the whole range
   * back one month, keeping its width. */
  allowExcludeCurrentMonth?: boolean;
  presets?: QuickSelectPreset[];
  firstDayOfWeekIdx?: SyncedPrefs['firstDayOfWeekIdx'];
  /** `endOffset` is how many months `end` sits before the current month —
   * see `TimeFrame.endOffset`. */
  onChangeDates: (start: string, end: string, endOffset: number) => void;
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
  granularities = ['month', 'day'],
  allowExcludeCurrentMonth = false,
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

  // The committed values' shape encodes the granularity, so it survives the
  // remounts that reports with a loading early-return cause on every commit.
  const granFor = (value: string): MonthRangeGranularity =>
    allowsDay && valueIsDay(value) ? 'day' : 'month';
  const [gran, setGran] = useState<MonthRangeGranularity>(granFor(start));
  const isDay = gran === 'day';

  // Edit a local draft while open; the report only recomputes on commit.
  const [draftStart, setDraftStart] = useState(start);
  const [draftEnd, setDraftEnd] = useState(end);
  // Set when a preset already committed, so closing doesn't overwrite it.
  const skipCommitRef = useRef(false);

  function openPopover() {
    const openGran = granFor(start);
    setGran(openGran);
    if (openGran === 'day') {
      setDraftStart(start);
      setDraftEnd(end);
    } else {
      setDraftStart(toMonth(start));
      setDraftEnd(toMonth(end));
    }
    skipCommitRef.current = false;
    setIsOpen(true);
  }

  function endOffsetFor(value: string) {
    return Math.max(0, differenceInCalendarMonths(currentMonth(), value));
  }

  function changeGranularity(next: MonthRangeGranularity) {
    if (next === gran) return;
    // Only reshape the draft; committing here recomputes the report, which
    // can unmount the Header and close this popover. Commit happens on close.
    setDraftStart(
      next === 'day' ? toDayStart(draftStart) : toMonth(draftStart),
    );
    setDraftEnd(next === 'day' ? toDayEnd(draftEnd) : toMonth(draftEnd));
    setGran(next);
  }

  function closeAndCommit() {
    setIsOpen(false);
    if (skipCommitRef.current) {
      return;
    }
    skipCommitRef.current = true;
    if (draftStart !== start || draftEnd !== end) {
      onChangeDates(draftStart, draftEnd, endOffsetFor(draftEnd));
    }
  }

  // Only offer the toggle in the two states it switches between: a month-mode
  // range ending at the current or the previous month.
  const draftEndMonth = toMonth(draftEnd);
  const excludesCurrentMonth = draftEndMonth === prevMonth(currentMonth());
  const showExcludeCurrentMonth =
    allowExcludeCurrentMonth &&
    !isDay &&
    (draftEndMonth === currentMonth() || excludesCurrentMonth);

  const hasSidebar =
    showGranularityToggle ||
    showExcludeCurrentMonth ||
    Boolean(presets?.length);

  function toggleExcludeCurrentMonth(exclude: boolean) {
    if (exclude === excludesCurrentMonth) return;
    const delta = exclude ? -1 : 1;
    setDraftStart(shiftMonths(draftStart, delta));
    setDraftEnd(shiftMonths(draftEnd, delta));
  }

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

  // Format by the values' actual shape; `gran` can desync from committed
  // values.
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
              start={draftStart}
              end={draftEnd}
              min={minDate}
              max={effectiveMax}
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
                    value={gran}
                    onChange={changeGranularity}
                  />
                </View>
              )}

              {showExcludeCurrentMonth && (
                <ExcludeCurrentMonthToggle
                  checked={excludesCurrentMonth}
                  onChange={toggleExcludeCurrentMonth}
                />
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
