import { useState } from 'react';

import * as monthUtils from 'loot-core/src/shared/months';

import useResizeObserver from '../../hooks/useResizeObserver';
import { styles, colors } from '../../style';
import { View } from '../common';

export const MonthPicker = ({
  startMonth,
  numDisplayed,
  monthBounds,
  style,
  onSelect,
}) => {
  const [hoverId, setHoverId] = useState(null);
  const [targetMonthCount, setTargetMonthCount] = useState(12);

  const currentMonth = monthUtils.currentMonth();
  const firstSelectedMonth = startMonth;

  const lastSelectedMonth = monthUtils.addMonths(
    firstSelectedMonth,
    numDisplayed - 1,
  );

  const range = monthUtils.rangeInclusive(
    monthUtils.subMonths(
      firstSelectedMonth,
      targetMonthCount / 2 - numDisplayed / 2,
    ),
    monthUtils.addMonths(
      lastSelectedMonth,
      targetMonthCount / 2 - numDisplayed / 2,
    ),
  );

  const firstSelectedIndex =
    Math.floor(range.length / 2) - Math.floor(numDisplayed / 2);
  const lastSelectedIndex = firstSelectedIndex + numDisplayed - 1;

  const [size, setSize] = useState('small');
  const containerRef = useResizeObserver(rect => {
    setSize(rect.width <= 400 ? 'small' : 'big');
    setTargetMonthCount(Math.max(Math.floor(rect.width / 50), 12));
  });

  let yearHeadersShown = [];

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
        innerRef={containerRef}
        style={{
          flexDirection: 'row',
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {range.map((month, idx) => {
          const monthName = monthUtils.format(month, 'MMM');
          const selected =
            idx >= firstSelectedIndex && idx <= lastSelectedIndex;

          const lastHoverId = hoverId + numDisplayed - 1;
          const hovered =
            hoverId === null ? false : idx >= hoverId && idx <= lastHoverId;

          const current = currentMonth === month;
          const year = monthUtils.getYear(month);

          let showYearHeader = false;

          if (!yearHeadersShown.includes(year)) {
            yearHeadersShown.push(year);
            showYearHeader = true;
          }

          const isMonthBudgeted =
            month >= monthBounds.start && month <= monthBounds.end;

          return (
            <View
              key={monthName}
              style={[
                {
                  padding: '3px 3px',
                  width: size === 'big' ? '35px' : '20px',
                  textAlign: 'center',
                  userSelect: 'none',
                  cursor: 'default',
                  borderRadius: 2,
                  border: 'none',
                },
                (!isMonthBudgeted ||
                  year !== monthUtils.getYear(firstSelectedMonth)) && {
                  color: colors.n7,
                },
                !isMonthBudgeted && { textDecoration: 'line-through' },
                styles.smallText,
                selected && {
                  backgroundColor: colors.p6,
                  color: 'white',
                },
                (hovered || selected) && {
                  borderRadius: 0,
                },
                hovered &&
                  !selected && {
                    backgroundColor: 'rgba(100, 100, 100, .15)',
                  },
                hovered &&
                  selected && {
                    backgroundColor: colors.p7,
                  },
                (idx === firstSelectedIndex ||
                  (idx === hoverId && !selected)) && {
                  borderTopLeftRadius: 2,
                  borderBottomLeftRadius: 2,
                },
                (idx === lastSelectedIndex ||
                  (idx === lastHoverId && !selected)) && {
                  borderTopRightRadius: 2,
                  borderBottomRightRadius: 2,
                },
                current && { fontWeight: 'bold' },
              ]}
              onClick={() => onSelect(month)}
              onMouseEnter={() => setHoverId(idx)}
              onMouseLeave={() => setHoverId(null)}
            >
              {size === 'small' ? monthName[0] : monthName}
              {showYearHeader && (
                <View
                  style={[
                    {
                      position: 'absolute',
                      top: -14,
                      left: 0,
                      fontSize: 10,
                      fontWeight: 'bold',
                    },
                    year !== monthUtils.getYear(firstSelectedMonth)
                      ? { color: colors.n7 }
                      : { color: '#272630' },
                  ]}
                >
                  {year}
                </View>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
};
