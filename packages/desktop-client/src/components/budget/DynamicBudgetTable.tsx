// @ts-strict-ignore
import type { ComponentProps } from 'react';
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { useHotkeys } from 'react-hotkeys-hook';

import { View } from '@actual-app/components/view';
import * as monthUtils from '@actual-app/core/shared/months';

import { FeatureErrorFallback } from '#components/FeatureErrorFallback';
import { useFeatureFlag } from '#hooks/useFeatureFlag';
import { useGlobalPref } from '#hooks/useGlobalPref';

import { useBudgetMonthCount } from './BudgetMonthCountContext';
import { BudgetPageHeader } from './BudgetPageHeader';
import { BudgetTable } from './BudgetTable';
import { clampMonth } from './MonthsContext';

export type SummaryLayout = 'side' | 'top';

export const SIDE_PANEL_WIDTH = 300;
export const SIDE_PANEL_GAP = 16;
const SIDE_PANEL_MIN_WIDTH = 780;

function getNumPossibleMonths(width: number, categoryWidth: number) {
  const estimatedTableWidth = width - categoryWidth;

  if (estimatedTableWidth < 500) {
    return 1;
  } else if (estimatedTableWidth < 750) {
    return 2;
  } else if (estimatedTableWidth < 1000) {
    return 3;
  } else if (estimatedTableWidth < 1250) {
    return 4;
  } else if (estimatedTableWidth < 1500) {
    return 5;
  }

  return 6;
}

type DynamicBudgetTableProps = {
  width: number;
  height: number;
} & AutoSizingBudgetTableProps;

const DynamicBudgetTable = ({
  type,
  width,
  height,
  prewarmStartMonth,
  startMonth,
  maxMonths = 3,
  monthBounds,
  onMonthSelect,
  onBudgetAction,
  ...props
}: DynamicBudgetTableProps) => {
  const { setDisplayMax } = useBudgetMonthCount();
  const [, setMaxMonthsPref] = useGlobalPref('maxMonths');
  const [categoryExpandedStatePref] = useGlobalPref('categoryExpandedState');
  const isGoalTemplatesEnabled = useFeatureFlag('goalTemplatesEnabled');
  const categoryExpandedState = categoryExpandedStatePref ?? 0;

  const numPossible = getNumPossibleMonths(
    width,
    200 + 100 * categoryExpandedState,
  );
  const numMonths = Math.min(numPossible, maxMonths);
  // With a single month there is room to show the month summary as a side
  // panel next to the table (the clearest layout for new users). Multiple
  // months keep the summaries stacked above their own column.
  const summaryLayout: SummaryLayout =
    numMonths === 1 && width >= SIDE_PANEL_MIN_WIDTH ? 'side' : 'top';
  const maxWidth =
    200 +
    100 * categoryExpandedState +
    500 * numMonths +
    (summaryLayout === 'side' ? SIDE_PANEL_WIDTH + SIDE_PANEL_GAP : 0);

  // Every displayed column must stay inside the bounds, so the first
  // column can go no later than `numMonths - 1` months before the end.
  const latestStartMonth = monthUtils.subMonths(monthBounds.end, numMonths - 1);

  function getValidMonth(month: string) {
    return clampMonth(month, {
      start: monthBounds.start,
      end: latestStartMonth,
    });
  }

  // Keep the last column in range when the bounds change (e.g. switching
  // budget type) or more columns fit on screen.
  useEffect(() => {
    const validMonth = clampMonth(startMonth, {
      start: monthBounds.start,
      end: latestStartMonth,
    });
    if (validMonth !== startMonth) {
      onMonthSelect(validMonth, numMonths);
    }
  }, [
    monthBounds.start,
    latestStartMonth,
    numMonths,
    onMonthSelect,
    startMonth,
  ]);

  useEffect(() => {
    setDisplayMax(numPossible);
  }, [setDisplayMax, numPossible]);

  function _onMonthSelect(month) {
    onMonthSelect(getValidMonth(month), numMonths);
  }

  useHotkeys(
    'left',
    () => {
      _onMonthSelect(monthUtils.prevMonth(startMonth));
    },
    {
      preventDefault: true,
      scopes: ['app'],
    },
    [_onMonthSelect, startMonth],
  );
  useHotkeys(
    'right',
    () => {
      _onMonthSelect(monthUtils.nextMonth(startMonth));
    },
    {
      preventDefault: true,
      scopes: ['app'],
    },
    [_onMonthSelect, startMonth],
  );
  useHotkeys(
    '0',
    () => {
      _onMonthSelect(
        monthUtils.subMonths(
          monthUtils.currentMonth(),
          type === 'envelope'
            ? Math.floor((numMonths - 1) / 2)
            : numMonths === 2
              ? 1
              : Math.max(numMonths - 2, 0),
        ),
      );
    },
    {
      preventDefault: true,
      scopes: ['app'],
    },
    [_onMonthSelect, startMonth, numMonths],
  );
  useHotkeys(
    'shift+t',
    () => {
      onBudgetAction(startMonth, 'overwrite-goal-template', null);
    },
    {
      preventDefault: true,
      scopes: ['app'],
      enabled: isGoalTemplatesEnabled,
    },
    [onBudgetAction, startMonth, isGoalTemplatesEnabled],
  );

  return (
    <View
      style={{
        width,
        height,
        alignItems: 'center',
        opacity: width <= 0 || height <= 0 ? 0 : 1,
      }}
    >
      <View style={{ width: '100%', maxWidth, flex: 1, minHeight: 0 }}>
        <ErrorBoundary FallbackComponent={FeatureErrorFallback}>
          <BudgetPageHeader
            maxMonths={maxMonths}
            onMaxMonthsChange={setMaxMonthsPref}
            onGoToToday={() => _onMonthSelect(monthUtils.currentMonth())}
          />
          <BudgetTable
            type={type}
            prewarmStartMonth={prewarmStartMonth}
            startMonth={startMonth}
            numMonths={numMonths}
            monthBounds={monthBounds}
            summaryLayout={summaryLayout}
            onMonthSelect={_onMonthSelect}
            onBudgetAction={onBudgetAction}
            {...props}
          />
        </ErrorBoundary>
      </View>
    </View>
  );
};

DynamicBudgetTable.displayName = 'DynamicBudgetTable';

type AutoSizingBudgetTableProps = Omit<
  ComponentProps<typeof BudgetTable>,
  'numMonths' | 'summaryLayout' | 'onMonthSelect'
> & {
  maxMonths: number;
  onMonthSelect: (month: string, numMonths: number) => void;
};

export const AutoSizingBudgetTable = (props: AutoSizingBudgetTableProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  // Measure before the first paint (AutoSizer measures after it)
  useLayoutEffect(() => {
    const parent = ref.current?.parentElement;
    if (!parent) {
      return;
    }

    function measure() {
      const { width, height } = parent.getBoundingClientRect();
      setSize(prev =>
        prev.width === width && prev.height === height
          ? prev
          : { width, height },
      );
    }

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(parent);
    return () => observer.disconnect();
  }, []);

  return (
    // Zero-size wrapper so the table doesn't affect the measured parent
    <div ref={ref} style={{ width: 0, height: 0, overflow: 'visible' }}>
      {size.width > 0 && size.height > 0 && (
        <DynamicBudgetTable
          width={size.width}
          height={size.height}
          {...props}
        />
      )}
    </div>
  );
};

AutoSizingBudgetTable.displayName = 'AutoSizingBudgetTable';
