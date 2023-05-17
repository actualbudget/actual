import React, {
  useContext,
  useState,
  useRef,
  useCallback,
  useLayoutEffect,
} from 'react';
import { useSpring, animated } from 'react-spring';

import { css } from 'glamor';

import * as monthUtils from 'loot-core/src/shared/months';

import useResizeObserver from '../../hooks/useResizeObserver';
import { View } from '../common';

import { MonthsContext } from './MonthsContext';

export default function BudgetSummaries({ SummaryComponent }) {
  let { months } = useContext(MonthsContext);

  let [widthState, setWidthState] = useState(0);
  let [styles, spring] = useSpring(() => ({
    x: 0,
    config: { mass: 3, tension: 600, friction: 80 },
  }));

  let containerRef = useResizeObserver(
    useCallback(rect => {
      setWidthState(rect.width);
    }, []),
  );

  let prevMonth0 = useRef(months[0]);

  let allMonths = [...months];
  allMonths.unshift(monthUtils.subMonths(months[0], 1));
  allMonths.push(monthUtils.addMonths(months[months.length - 1], 1));
  let monthWidth = widthState / months.length;

  useLayoutEffect(() => {
    let prevMonth = prevMonth0.current;
    let reversed = prevMonth > months[0];
    let offsetX = monthWidth;
    let from = reversed ? -offsetX * 2 : 0;
    if (prevMonth !== allMonths[0] && prevMonth !== allMonths[2]) {
      from = -offsetX;
    }
    let to = -offsetX;
    spring.start({ from: { x: from }, x: to });
  }, [months[0]]);

  useLayoutEffect(() => {
    prevMonth0.current = months[0];
  }, [months[0]]);

  useLayoutEffect(() => {
    spring.start({ from: { x: -monthWidth }, to: { x: -monthWidth } });
  }, [monthWidth]);

  return (
    <div
      {...css([
        { flex: 1, overflow: 'hidden' },
        months.length === 1 && {
          marginLeft: -4,
          marginRight: -4,
        },
      ])}
      ref={containerRef}
    >
      <animated.div
        className="view"
        style={{
          flexDirection: 'row',
          width: widthState,
          willChange: 'transform',
          transform: styles.x.to(x => `translateX(${x}px)`),
        }}
      >
        {allMonths.map(month => {
          return (
            <View
              key={month}
              style={[
                { flex: `0 0 ${monthWidth}px` },
                { paddingLeft: 4, paddingRight: 4 },
              ]}
            >
              <SummaryComponent month={month} />
            </View>
          );
        })}
      </animated.div>
    </div>
  );
}
