import React, {
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { animated, useSpring } from 'react-spring';

import { View } from '@actual-app/components/view';
import { css } from '@emotion/css';

import { addMonths, subMonths } from 'loot-core/shared/months';

import { MonthsContext } from './MonthsContext';

import { useBudgetComponents } from '.';

import { useResizeObserver } from '@desktop-client/hooks/useResizeObserver';

export function BudgetSummaries() {
  const { months } = useContext(MonthsContext);
  const [firstMonth] = months;

  const [widthState, setWidthState] = useState(0);
  const [styles, spring] = useSpring(() => ({
    x: 0,
    config: { mass: 3, tension: 600, friction: 80 },
  }));

  const containerRef = useResizeObserver<HTMLDivElement>(
    useCallback(rect => {
      setWidthState(rect.width);
    }, []),
  );

  const prevMonth0 = useRef(firstMonth);
  const allMonths = useMemo(() => {
    const all = [...months];
    all.unshift(subMonths(firstMonth, 1));
    all.push(addMonths(months[months.length - 1], 1));
    return all;
  }, [months, firstMonth]);
  const monthWidth = widthState / months.length;

  useLayoutEffect(() => {
    const prevMonth = prevMonth0.current;
    const reversed = prevMonth > firstMonth;
    const offsetX = monthWidth;
    let from = reversed ? -offsetX * 2 : 0;

    if (prevMonth !== allMonths[0] && prevMonth !== allMonths[2]) {
      from = -offsetX;
    }

    const to = -offsetX;
    spring.start({ from: { x: from }, x: to });
  }, [spring, firstMonth, monthWidth, allMonths]);

  useLayoutEffect(() => {
    prevMonth0.current = firstMonth;
  }, [firstMonth]);

  useLayoutEffect(() => {
    spring.start({ from: { x: -monthWidth }, to: { x: -monthWidth } });
  }, [spring, monthWidth]);

  const { SummaryComponent } = useBudgetComponents();

  return (
    <div
      className={css([
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
              style={{
                flex: `0 0 ${monthWidth}px`,
                paddingLeft: 4,
                paddingRight: 4,
              }}
            >
              <SummaryComponent month={month} />
            </View>
          );
        })}
      </animated.div>
    </div>
  );
}
