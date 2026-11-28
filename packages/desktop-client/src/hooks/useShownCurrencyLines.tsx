import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import * as monthUtils from '@actual-app/core/shared/months';

import type { Binding, SheetFields } from '#spreadsheet';
import { envelopeBudget } from '#spreadsheet/bindings';

import { useCategoryCurrencies } from './useCategoryCurrencies';
import type { CategoryLine } from './useCategoryCurrencies';
import { SheetNameProvider } from './useSheetName';
import { useSheetValue } from './useSheetValue';

type ActivityChange = (
  lineId: string,
  month: string,
  isActive: boolean,
) => void;

function useLineValue<FieldName extends SheetFields<'envelope-budget'>>(
  binding: Binding<'envelope-budget', FieldName>,
) {
  return useSheetValue(binding);
}

// Reports whether a currency line has a budget, spending or a balance in
// the month of the sheet around it. Both budget types name these cells
// the same way.
function LineMonthActivity({
  lineId,
  month,
  onChange,
}: {
  lineId: string;
  month: string;
  onChange: ActivityChange;
}) {
  const budgeted = useLineValue(envelopeBudget.catBudgeted(lineId));
  const spent = useLineValue(envelopeBudget.catSumAmount(lineId));
  const balance = useLineValue(envelopeBudget.catBalance(lineId));
  const isActive = [budgeted, spent, balance].some(
    value => typeof value === 'number' && value !== 0,
  );

  useEffect(() => {
    onChange(lineId, month, isActive);
  }, [lineId, month, isActive, onChange]);

  return null;
}

// Which currency lines a budget shows over `months`: a line shows when it
// has a budget, spending or a balance in one of them, so quiet months stay
// clean. A stored line also shows from its first month on, or from the
// current month for one that covers every month, so it can be budgeted
// ahead, also from an earlier month. `probes` must be rendered for the
// values to be known; it watches the lines in `lineIds`, every line
// without it.
export function useShownCurrencyLines(
  months: readonly string[],
  lineIds?: readonly string[],
): {
  isLineShown: (lineId: string) => boolean;
  probes: ReactNode;
} {
  const { currencies } = useCategoryCurrencies();
  const [activeKeys, setActiveKeys] = useState<ReadonlySet<string>>(
    () => new Set(),
  );

  const onChange = useCallback<ActivityChange>((lineId, month, isActive) => {
    const key = `${lineId}|${month}`;
    setActiveKeys(previous => {
      if (previous.has(key) === isActive) {
        return previous;
      }
      const next = new Set(previous);
      if (isActive) {
        next.add(key);
      } else {
        next.delete(key);
      }
      return next;
    });
  }, []);

  const watched = useMemo(
    () =>
      lineIds == null
        ? currencies
        : currencies.filter(line => lineIds.includes(line.id)),
    [currencies, lineIds],
  );

  const isLineShown = useCallback(
    (lineId: string) => {
      const line = currencies.find(entity => entity.id === lineId);
      // A category's own budget always shows
      if (!line) {
        return true;
      }
      const shownFrom = line.start_month ?? monthUtils.currentMonth();
      return months.some(
        month =>
          activeKeys.has(`${lineId}|${month}`) ||
          (!line.automatic && month >= shownFrom),
      );
    },
    [activeKeys, currencies, months],
  );

  const probes = months.map(month => (
    <SheetNameProvider key={month} name={monthUtils.sheetForMonth(month)}>
      {watched.map(line => (
        <LineMonthActivity
          key={line.id}
          lineId={line.id}
          month={month}
          onChange={onChange}
        />
      ))}
    </SheetNameProvider>
  ));

  return { isLineShown, probes };
}

// The lines a category shows in one month, as on a phone: its own budget
// and the currencies shown, or none when no other currency shows, so it
// looks like any category. `probes` must be rendered, as above.
export function useShownCategoryLines(
  categoryId: string | undefined,
  month: string,
): { lines: CategoryLine[]; probes: ReactNode } {
  const { getLines } = useCategoryCurrencies();
  const lines = categoryId != null ? getLines(categoryId) : [];
  const months = useMemo(() => [month], [month]);
  // Stable while the lines are, so the probes don't start over
  const lineIds = useMemo(
    () =>
      (categoryId != null ? getLines(categoryId) : [])
        .filter(line => line.id !== categoryId)
        .map(line => line.id),
    [categoryId, getLines],
  );
  const { isLineShown, probes } = useShownCurrencyLines(months, lineIds);

  const shown = lines.filter(
    line => line.id === categoryId || isLineShown(line.id),
  );
  return {
    lines: shown.some(line => line.id !== categoryId) ? shown : [],
    probes,
  };
}
