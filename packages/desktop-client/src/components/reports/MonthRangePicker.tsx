import { useMemo, useRef, useState } from 'react';
import { Trans } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { useResponsive } from '@actual-app/components/hooks/useResponsive';
import { Popover } from '@actual-app/components/popover';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import {
  currentMonth,
  differenceInCalendarMonths,
  format,
} from '@actual-app/core/shared/months';

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
} from './month-range-picker/util';

type MonthRangePickerProps = {
  start: string;
  end: string;
  /** Inclusive lower bound (`yyyy-MM` or `yyyy-MM-dd`). `allMonths` is
   * newest-first in the reports header, so pass its last entry here. */
  minDate: string;
  /** Inclusive upper bound (`yyyy-MM` or `yyyy-MM-dd`). Omit (or set
   * `allowFuture`) for no upper limit — the user can then pick any future
   * month/day and the report simply shows empty future periods. */
  maxDate?: string;
  /** Convenience flag for an open-ended future: equivalent to omitting
   * `maxDate`. */
  allowFuture?: boolean;
  /** Initial granularity. The user can switch it with the in-popover toggle;
   * committed values are emitted in the active granularity (`yyyy-MM` for
   * month, `yyyy-MM-dd` for day). */
  granularity?: MonthRangeGranularity;
  /** Which granularities the consuming report supports. Maintainers embedding
   * the picker use this to limit day-level selection to reports that actually
   * render daily data — pass `['month']` for month-only reports (Budget
   * Analysis, monthly Net Worth, …) to hide the Day toggle entirely. Defaults
   * to both. */
  granularities?: MonthRangeGranularity[];
  /** Notified when the user flips the Month/Day toggle so the consumer can
   * persist the choice. */
  onChangeGranularity?: (granularity: MonthRangeGranularity) => void;
  /** Show an "Exclude current month" checkbox that shifts the whole range back
   * one month (keeping its width) so a live range can end last month. Only
   * makes sense for past ranges. */
  allowExcludeCurrentMonth?: boolean;
  presets?: QuickSelectPreset[];
  /** `endOffset` is how many months before the current month the committed
   * `end` sits (0 if it's the current month), computed at commit time so the
   * consumer can persist it — see `TimeFrame.endOffset` for why. */
  onChangeDates: (start: string, end: string, endOffset: number) => void;
};

// Far-future sentinel used when there is no upper bound. Sorts after any real
// `yyyy-MM` or `yyyy-MM-dd` string lexicographically.
const NO_MAX = '9999-12-31';

export function MonthRangePicker({
  start,
  end,
  minDate,
  maxDate,
  allowFuture = false,
  granularity = 'month',
  granularities = ['month', 'day'],
  onChangeGranularity,
  allowExcludeCurrentMonth = false,
  presets,
  onChangeDates,
}: MonthRangePickerProps) {
  const effectiveMax = allowFuture || maxDate == null ? NO_MAX : maxDate;
  const locale = useLocale();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const { isNarrowWidth } = useResponsive();

  // Only offer the Day toggle when the report supports it. When a report is
  // month-only, force month granularity regardless of the incoming prop so a
  // stale persisted `granularity` can't leave it stuck in day mode.
  const allowsDay = granularities.includes('day');
  const showGranularityToggle = allowsDay && granularities.includes('month');

  // `gran` is the source of truth for "last granularity the user picked in
  // this picker" and survives the popover closing — most consumers don't
  // wire `onChangeGranularity` back into the `granularity` prop, so relying
  // on the prop to reopen in the same mode would silently revert to it on
  // every close. Only the initial mount seeds from the prop.
  const [gran, setGran] = useState<MonthRangeGranularity>(
    allowsDay ? granularity : 'month',
  );
  const isDay = gran === 'day';

  const hasSidebar =
    showGranularityToggle ||
    allowExcludeCurrentMonth ||
    Boolean(presets?.length);

  // While the popover is open we edit a local draft so the (potentially
  // expensive) report only recomputes once — when the popover closes — rather
  // than on every month click. A user can pick both start and end first.
  const [draftStart, setDraftStart] = useState(start);
  const [draftEnd, setDraftEnd] = useState(end);
  // Set when a preset already applied a range, so the close handler doesn't
  // commit (and overwrite) the stale draft. `onOpenChange` can fire more than
  // once for a single close, so this also makes committing idempotent.
  const skipCommitRef = useRef(false);

  function openPopover() {
    // Reopen in whichever granularity the user last picked in this popover
    // (not the `granularity` prop — see `gran`'s declaration), so the draft
    // and grid match. A month-only report is always forced to month mode.
    const openGran = allowsDay ? gran : 'month';
    setGran(openGran);
    if (openGran === 'day') {
      setDraftStart(toDayStart(start));
      setDraftEnd(toDayEnd(end));
    } else {
      setDraftStart(toMonth(start));
      setDraftEnd(toMonth(end));
    }
    skipCommitRef.current = false;
    setIsOpen(true);
  }

  // How many months before the current month `value` sits, clamped to >= 0
  // (a future end anchors to now, same clamp calculateTimeRange applies).
  function endOffsetFor(value: string) {
    return Math.max(0, differenceInCalendarMonths(currentMonth(), value));
  }

  function changeGranularity(next: MonthRangeGranularity) {
    if (next === gran) return;
    // Switching granularity commits immediately (like a preset) instead of
    // waiting for the popover to close, so the report reflects the new
    // granularity's range right away.
    const nextStart =
      next === 'day' ? toDayStart(draftStart) : toMonth(draftStart);
    const nextEnd = next === 'day' ? toDayEnd(draftEnd) : toMonth(draftEnd);
    setDraftStart(nextStart);
    setDraftEnd(nextEnd);
    setGran(next);
    onChangeGranularity?.(next);
    onChangeDates(nextStart, nextEnd, endOffsetFor(nextEnd));
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

  // The current month is "excluded" when the draft range ends before it. This
  // is derived from the draft (not a separate flag) so it stays consistent when
  // the user edits the ends directly.
  const excludesCurrentMonth = toMonth(draftEnd) < currentMonth();

  function toggleExcludeCurrentMonth(exclude: boolean) {
    // Only shift when it actually changes the exclusion state to avoid drifting
    // a range that already ends further in the past.
    if (exclude === excludesCurrentMonth) return;
    // Shift the whole range one month while keeping its width, so a live range
    // ends either at or one month before the current month.
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

  // The trigger reflects the in-progress draft while open, and the committed
  // range otherwise.
  const shownStart = isOpen ? draftStart : start;
  const shownEnd = isOpen ? draftEnd : end;

  const label = useMemo(() => {
    // Derive the display format from the actual shape of the shown values
    // rather than the `gran` flag, which can desync from the committed range
    // (e.g. once the popover closes and a non-persisting report's prop reverts
    // to 'month'). A `yyyy-MM-dd` value is longer than a `yyyy-MM` one.
    const fmt = valueIsDay(shownStart) ? 'P' : 'MMM yyyy';
    return `${format(shownStart, fmt, locale)} – ${format(
      shownEnd,
      fmt,
      locale,
    )}`;
  }, [shownStart, shownEnd, locale]);

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
        // Fires on outside-click / Esc as well as programmatic closes; commit
        // the draft in every case.
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
              onChange={setDraft}
            />
          </View>

          {hasSidebar ? (
            <View style={{ padding: 15, minWidth: 140, gap: 16 }}>
              {/* Choose how to pick the range: whole months or exact days. Hidden
                for month-only reports, where day mode does nothing. */}
              {showGranularityToggle ? (
                <View>
                  <Text
                    style={{
                      fontWeight: 'bold',
                      marginBottom: 8,
                      fontSize: 12,
                      textTransform: 'uppercase',
                      color: theme.pageTextSubdued,
                    }}
                  >
                    <Trans>Select by</Trans>
                  </Text>
                  <GranularityToggle
                    value={gran}
                    onChange={changeGranularity}
                  />
                </View>
              ) : null}

              {allowExcludeCurrentMonth ? (
                <ExcludeCurrentMonthToggle
                  checked={excludesCurrentMonth}
                  onChange={toggleExcludeCurrentMonth}
                />
              ) : null}

              {presets?.length ? (
                <View>
                  <Text
                    style={{
                      fontWeight: 'bold',
                      marginBottom: 8,
                      fontSize: 12,
                      textTransform: 'uppercase',
                      color: theme.pageTextSubdued,
                    }}
                  >
                    <Trans>Quick select</Trans>
                  </Text>
                  <View style={{ gap: 4 }}>
                    {presets.map(preset => (
                      <Button
                        key={preset.key}
                        variant="bare"
                        onPress={() => {
                          // Presets apply immediately via their own onSelect;
                          // skip the draft-commit-on-close so it can't overwrite
                          // them.
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
              ) : null}
            </View>
          ) : null}
        </View>
      </Popover>
    </View>
  );
}
