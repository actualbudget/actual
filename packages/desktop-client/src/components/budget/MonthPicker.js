import { useState } from 'react';

import * as monthUtils from 'loot-core/src/shared/months';

import useResizeObserver from '../../hooks/useResizeObserver';
import ArrowThinLeft from '../../icons/v1/ArrowThinLeft';
import ArrowThinRight from '../../icons/v1/ArrowThinRight';
import { styles, colors } from '../../style';
import { View, Button } from '../common';

export const MonthPicker = ({
  startMonth,
  numDisplayed,
  monthBounds,
  style,
  onSelect,
}) => {
  const currentMonth = monthUtils.currentMonth();
  const firstSelectedMonth = startMonth;

  const lastSelectedMonth = monthUtils.addMonths(
    firstSelectedMonth,
    numDisplayed - 1,
  );

  const range = monthUtils.rangeInclusive(
    monthUtils.subMonths(firstSelectedMonth, 6 - numDisplayed / 2),
    monthUtils.addMonths(lastSelectedMonth, 6 - numDisplayed / 2),
  );

  const selectedIndex =
    Math.floor(range.length / 2) - Math.floor(numDisplayed / 2);

  const [size, setSize] = useState('small');
  const containerRef = useResizeObserver(rect => {
    setSize(rect.width <= 400 ? 'small' : 'big');
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
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            flex: '0 0 48px',
            justifyContent: 'flex-start',
          }}
        >
          <Button
            onClick={() => onSelect(monthUtils.subMonths(startMonth, 1))}
            bare
          >
            <ArrowThinLeft width={12} height={12} />
          </Button>
        </View>

        {range.map((month, idx) => {
          const monthName = monthUtils.format(month, 'MMM');
          const lastSelectedIndex = selectedIndex + numDisplayed;
          const selected = idx >= selectedIndex && idx < lastSelectedIndex;

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
                  marginRight: 1,
                  padding: '3px 3px',
                  width: size === 'big' ? '35px' : '20px',
                  textAlign: 'center',
                  cursor: 'default',
                  borderRadius: 2,
                  ':hover': isMonthBudgeted && {
                    backgroundColor: colors.p6,
                    color: 'white',
                  },
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
                current && { fontWeight: 'bold' },
              ]}
              onClick={() => onSelect(month)}
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
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            flex: '0 0 48px',
            justifyContent: 'flex-end',
          }}
        >
          <Button
            onClick={() => onSelect(monthUtils.addMonths(startMonth, 1))}
            bare
          >
            <ArrowThinRight width={12} height={12} />
          </Button>
        </View>
      </View>
    </View>
  );
};
