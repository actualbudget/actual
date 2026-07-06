import { useMemo, useRef, useState } from 'react';
import { Trans } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { useResponsive } from '@actual-app/components/hooks/useResponsive';
import { Popover } from '@actual-app/components/popover';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import * as monthUtils from '@actual-app/core/shared/months';

import { useLocale } from '#hooks/useLocale';

import { RangeEndSelector } from './month-range-picker/RangeEndSelector';
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
  granularity?: MonthRangeGranularity;
  presets?: QuickSelectPreset[];
  onChangeDates: (start: string, end: string) => void;
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
  presets,
  onChangeDates,
}: MonthRangePickerProps) {
  const effectiveMax = allowFuture || maxDate == null ? NO_MAX : maxDate;
  const locale = useLocale();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const { isNarrowWidth } = useResponsive();

  const isDay = granularity === 'day';

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
    // Seed the draft from the committed range each time we open.
    setDraftStart(start);
    setDraftEnd(end);
    skipCommitRef.current = false;
    setIsOpen(true);
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
    const fmt = isDay ? 'P' : 'MMM yyyy';
    return `${monthUtils.format(shownStart, fmt, locale)} – ${monthUtils.format(
      shownEnd,
      fmt,
      locale,
    )}`;
  }, [shownStart, shownEnd, isDay, locale]);

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
              ...(presets?.length
                ? isNarrowWidth
                  ? { borderBottom: `1px solid ${theme.tableBorder}` }
                  : { borderRight: `1px solid ${theme.tableBorder}` }
                : {}),
            }}
          >
            <RangeEndSelector
              title={<Trans>Start</Trans>}
              value={draftStart}
              min={minDate}
              max={draftEnd}
              isDay={isDay}
              locale={locale}
              onChange={value => setDraft(value, draftEnd)}
            />
            <View style={{ height: 20 }} />
            <RangeEndSelector
              title={<Trans>End</Trans>}
              value={draftEnd}
              min={draftStart}
              max={effectiveMax}
              isDay={isDay}
              locale={locale}
              onChange={value => setDraft(draftStart, value)}
            />
          </View>

          {presets?.length ? (
            <View style={{ padding: 15, minWidth: 140 }}>
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
                      // Presets apply immediately via their own onSelect; skip
                      // the draft-commit-on-close so it can't overwrite them.
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
      </Popover>
    </View>
  );
}
