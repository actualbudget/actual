import React from 'react';

import CalendarIcon from '../../icons/v2/Calendar';
import { colors } from '../../style';
import { View } from '../common';

import { useBudgetMonthCount } from './BudgetMonthCountContext';

function Calendar({ color, onClick }) {
  return (
    <CalendarIcon
      style={{ width: 13, height: 13, color: color, marginRight: 5 }}
      onClick={onClick}
    />
  );
}

export function MonthCountSelector({ maxMonths, onChange }) {
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
        color={maxMonths >= i ? colors.n5 : colors.n8}
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
