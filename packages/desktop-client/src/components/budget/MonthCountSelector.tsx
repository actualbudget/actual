import React from 'react';

import CalendarIcon from '../../icons/v2/Calendar';
import { theme } from '../../style';
import View from '../common/View';

import { useBudgetMonthCount } from './BudgetMonthCountContext';

type CalendarProps = {
  color: string;
  onClick: () => void;
};

function Calendar({ color, onClick }: CalendarProps) {
  return (
    <CalendarIcon
      style={{ width: 13, height: 13, color, marginRight: 5 }}
      onClick={onClick}
    />
  );
}

type MonthCountSelectorProps = {
  maxMonths: number;
  onChange: (value: number) => Promise<void>;
};

export function MonthCountSelector({
  maxMonths,
  onChange,
}: MonthCountSelectorProps) {
  let { displayMax } = useBudgetMonthCount();

  // It doesn't make sense to show anything if we can only fit one
  // month
  if (displayMax <= 1) {
    return null;
  }

  let calendars = [];
  for (let i = 1; i <= displayMax; i++) {
    calendars.push(
      <Calendar
        key={i}
        color={
          maxMonths >= i ? theme.altpageTextSubdued : theme.altButtonBareText
        }
        onClick={() => onChange(i)}
      />,
    );
  }

  return (
    <View
      style={{
        flexDirection: 'row',
        marginRight: 20,
        marginTop: -1,
        WebkitAppRegion: 'no-drag',
        '& svg': {
          transition: 'transform .15s',
        },
        '& svg:hover': {
          transform: 'scale(1.2)',
        },
      }}
      title="Choose the number of months shown at a time"
    >
      {calendars}
    </View>
  );
}
