// @ts-strict-ignore
import React, { useEffect, type ComponentProps } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import AutoSizer from 'react-virtualized-auto-sizer';

import * as monthUtils from 'loot-core/src/shared/months';

import { View } from '../common/View';

import { useBudgetMonthCount } from './BudgetMonthCountContext';
import { BudgetPageHeader } from './BudgetPageHeader';
import { BudgetTable } from './BudgetTable';

function getNumPossibleMonths(width: number) {
  const estimatedTableWidth = width - 200;

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

type DynamicBudgetTableInnerProps = {
  width: number;
  height: number;
} & DynamicBudgetTableProps;

const DynamicBudgetTableInner = ({
  width,
  height,
  prewarmStartMonth,
  startMonth,
  maxMonths = 3,
  monthBounds,
  onMonthSelect,
  ...props
}: DynamicBudgetTableInnerProps) => {
  const { setDisplayMax } = useBudgetMonthCount();

  const numPossible = getNumPossibleMonths(width);
  const numMonths = Math.min(numPossible, maxMonths);
  const maxWidth = 200 + 500 * numMonths;

  useEffect(() => {
    setDisplayMax(numPossible);
  }, [numPossible]);

  function getValidMonth(month) {
    const start = monthBounds.start;
    const end = monthUtils.subMonths(monthBounds.end, numMonths - 1);

    if (month < start) {
      return start;
    } else if (month > end) {
      return end;
    }
    return month;
  }

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
          Math.floor(numMonths / 2),
        ),
      );
    },
    {
      preventDefault: true,
      scopes: ['app'],
    },
    [_onMonthSelect, startMonth, numMonths],
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
      <View style={{ width: '100%', maxWidth }}>
        <BudgetPageHeader
          startMonth={prewarmStartMonth}
          numMonths={numMonths}
          monthBounds={monthBounds}
          onMonthSelect={_onMonthSelect}
        />
        <BudgetTable
          prewarmStartMonth={prewarmStartMonth}
          startMonth={startMonth}
          numMonths={numMonths}
          monthBounds={monthBounds}
          {...props}
        />
      </View>
    </View>
  );
};

DynamicBudgetTableInner.displayName = 'DynamicBudgetTableInner';

type DynamicBudgetTableProps = ComponentProps<typeof BudgetTable>;

export const DynamicBudgetTable = (props: DynamicBudgetTableProps) => {
  return (
    <AutoSizer>
      {({ width, height }) => (
        <DynamicBudgetTableInner width={width} height={height} {...props} />
      )}
    </AutoSizer>
  );
};

DynamicBudgetTable.displayName = 'DynamicBudgetTable';
