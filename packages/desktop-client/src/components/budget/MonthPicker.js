import { useState } from 'react';

import * as monthUtils from 'loot-core/src/shared/months';

import useResizeObserver from '../../hooks/useResizeObserver';
import ArrowThinLeft from '../../icons/v1/ArrowThinLeft';
import ArrowThinRight from '../../icons/v1/ArrowThinRight';
import { styles, colors } from '../../style';
import { View, Button } from '../common';

function getMonth(year, idx) {
  return monthUtils.addMonths(year, idx);
}

function getCurrentMonthName(startMonth, currentMonth) {
  return monthUtils.getYear(startMonth) === monthUtils.getYear(currentMonth)
    ? monthUtils.format(currentMonth, 'MMM')
    : null;
}

export const MonthPicker = ({
  startMonth,
  numDisplayed,
  monthBounds,
  style,
  onSelect,
}) => {
  const currentMonth = monthUtils.currentMonth();
  const range = getRangeForYear(currentMonth);
  const monthNames = range.map(month => {
    return monthUtils.format(month, 'MMM');
  });
  const currentMonthName = getCurrentMonthName(startMonth, currentMonth);
  const year = monthUtils.getYear(startMonth);
  const selectedIndex = monthUtils.getMonthIndex(startMonth);

  const [size, setSize] = useState('small');
  const containerRef = useResizeObserver(rect => {
    setSize(rect.width <= 320 ? 'small' : rect.width <= 400 ? 'medium' : 'big');
  });

  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        },
        style,
      ]}
    >
      <View
        style={{
          padding: '3px 0px',
          margin: '3px 0',
          fontWeight: 'bold',
          fontSize: 14,
          flex: '0 0 40px',
        }}
      >
        {monthUtils.format(year, 'yyyy')}
      </View>
      <View
        innerRef={containerRef}
        style={{
          flexDirection: 'row',
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {monthNames.map((monthName, idx) => {
          const lastSelectedIndex = selectedIndex + numDisplayed;
          const selected = idx >= selectedIndex && idx < lastSelectedIndex;
          const current = monthName === currentMonthName;
          const month = getMonth(year, idx);
          const isMonthBudgeted =
            month >= monthBounds.start && month <= monthBounds.end;

          return (
            <View
              key={monthName}
              style={[
                {
                  marginRight: 1,
                  padding: size === 'big' ? '3px 5px' : '3px 3px',
                  textAlign: 'center',
                  cursor: 'default',
                  borderRadius: 2,
                  ':hover': isMonthBudgeted && {
                    backgroundColor: colors.p6,
                    color: 'white',
                  },
                },
                !isMonthBudgeted && { color: colors.n7 },
                styles.smallText,
                selected && {
                  backgroundColor: colors.p6,
                  color: 'white',
                  borderRadius: 0,
                },
                idx === selectedIndex && {
                  borderTopLeftRadius: 2,
                  borderBottomLeftRadius: 2,
                },
                idx === lastSelectedIndex - 1 && {
                  borderTopRightRadius: 2,
                  borderBottomRightRadius: 2,
                },
                idx >= selectedIndex &&
                  idx < lastSelectedIndex - 1 && {
                    marginRight: 0,
                    borderRight: 'solid 1px',
                    borderColor: colors.p6,
                  },
                current && { textDecoration: 'underline' },
              ]}
              onClick={() => onSelect(month)}
            >
              {size === 'small' ? monthName[0] : monthName}
            </View>
          );
        })}
      </View>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          flex: '0 0 50px',
          justifyContent: 'flex-end',
        }}
      >
        <Button
          onClick={() => onSelect(monthUtils.subMonths(startMonth, 1))}
          bare
        >
          <ArrowThinLeft width={12} height={12} />
        </Button>
        <Button
          onClick={() => onSelect(monthUtils.addMonths(startMonth, 1))}
          bare
        >
          <ArrowThinRight width={12} height={12} />
        </Button>
      </View>
    </View>
  );
};
