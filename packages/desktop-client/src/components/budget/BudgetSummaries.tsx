import React, {
  useContext,
  useState,
  useRef,
  useCallback,
  useLayoutEffect,
} from 'react';
import { useSpring, animated } from 'react-spring';

import { css } from '@emotion/css';
import { useMediaQuery } from 'usehooks-ts';

import { addMonths, subMonths } from 'loot-core/src/shared/months';

import { useResizeObserver } from '../../hooks/useResizeObserver';
import { useSpaceMeasure } from '../../hooks/useSpaceMeasure';
import { View } from '../common/View';

import { type BudgetSummary as EnvelopeBudgetSummary } from './envelope/budgetsummary/BudgetSummary';
import { MonthsContext } from './MonthsContext';
import { type BudgetSummary as TrackingBudgetSummary } from './tracking/budgetsummary/BudgetSummary';

type BudgetSummariesProps = {
  SummaryComponent: typeof TrackingBudgetSummary | typeof EnvelopeBudgetSummary;
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

  // Re-render when printing to get the correct width
  const isPrinting = useMediaQuery('print');
  const measure = useSpaceMeasure();

  const prevMonth0 = useRef(months[0]);
  const allMonths = [...months];
  allMonths.unshift(subMonths(months[0], 1));
  allMonths.push(addMonths(months[months.length - 1], 1));
  const totalWidth = isPrinting ? (measure.width() ?? widthState) : widthState;
  const monthWidth = totalWidth / months.length;

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
      className={css([
        { flex: 1, overflow: 'hidden', position: 'relative' },
        months.length === 1 && {
          marginLeft: -4,
          marginRight: -4,
        },
      ])}
      ref={containerRef}
    >
      {measure.elements}
      <animated.div
        className="view"
        style={{
          flexDirection: 'row',
          width: totalWidth,
          ...(!isPrinting && {
            willChange: 'transform',
            transform: styles.x.to(x => `translateX(${x}px)`),
          }),
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
