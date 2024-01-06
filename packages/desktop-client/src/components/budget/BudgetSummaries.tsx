import React, {
  useContext,
  useState,
  useRef,
  useCallback,
  useLayoutEffect,
} from 'react';
import { useSpring, animated } from 'react-spring';

import { css } from 'glamor';

import { addMonths, subMonths } from 'loot-core/src/shared/months';

import { useResizeObserver } from '../../hooks/useResizeObserver';
import { View } from '../common/View';

import { MonthsContext } from './MonthsContext';
import { type BudgetSummary as ReportBudgetSummary } from './report/budgetsummary/BudgetSummary';
import { type BudgetSummary as RolloverBudgetSummary } from './rollover/budgetsummary/BudgetSummary';

type BudgetSummariesProps = {
  SummaryComponent: typeof ReportBudgetSummary | typeof RolloverBudgetSummary;
};

export function BudgetSummaries({ SummaryComponent }: BudgetSummariesProps) {
  const { months } = useContext(MonthsContext);

  const [widthState, setWidthState] = useState(0);
  const [styles, spring] = useSpring(() => ({
    x: 0,
    config: { mass: 3, tension: 600, friction: 80 },
  }));

  const containerRef = useResizeObserver(
    useCallback(rect => {
      setWidthState(rect.width);
    }, []),
  );

  const prevMonth0 = useRef(months[0]);
  const allMonths = [...months];
  allMonths.unshift(subMonths(months[0], 1));
  allMonths.push(addMonths(months[months.length - 1], 1));
  const monthWidth = widthState / months.length;

  useLayoutEffect(() => {
    const prevMonth = prevMonth0.current;
    const reversed = prevMonth > months[0];
    const offsetX = monthWidth;
    let from = reversed ? -offsetX * 2 : 0;

    if (prevMonth !== allMonths[0] && prevMonth !== allMonths[2]) {
      from = -offsetX;
    }

    const to = -offsetX;
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
      className={`${css([
        { flex: 1, overflow: 'hidden' },
        months.length === 1 && {
          marginLeft: -4,
          marginRight: -4,
        },
      ])}`}
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
