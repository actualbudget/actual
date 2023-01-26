import React, {
  useContext,
  useState,
  useRef,
  useCallback,
  useLayoutEffect
} from 'react';

import { css } from 'glamor';
import { Spring } from 'wobble';

import * as monthUtils from 'loot-core/src/shared/months';

import { View } from '../common';
import useResizeObserver from '../useResizeObserver';

import { MonthsContext } from './MonthsContext';

export default function BudgetSummaries({ SummaryComponent }) {
  let { months } = useContext(MonthsContext);

  let [widthState, setWidthState] = useState(0);
  let spring = useRef(null);

  let containerRef = useResizeObserver(
    useCallback(rect => {
      setWidthState(rect.width);
    }, [])
  );
  let scrollerRef = useRef();

  let prevMonth0 = useRef(months[0]);

  let allMonths = [...months];
  allMonths.unshift(monthUtils.subMonths(months[0], 1));
  allMonths.push(monthUtils.addMonths(months[months.length - 1], 1));
  let monthWidth = widthState / months.length;

  useLayoutEffect(() => {
    if (!scrollerRef.current) {
      return;
    }

    if (!spring.current) {
      spring.current = new Spring({
        stiffness: 600,
        damping: 80,
        mass: 3,
        fromValue: -monthWidth
      });

      spring.current.onUpdate(s => {
        if (scrollerRef.current) {
          scrollerRef.current.style.transform =
            'translateX(' + s.currentValue + 'px)';
        }
      });
    }

    let prevMonth = prevMonth0.current;
    let reversed = prevMonth > months[0];
    let offsetX = monthWidth;

    let from = reversed ? -offsetX * 2 : 0;
    if (prevMonth !== allMonths[0] && prevMonth !== allMonths[2]) {
      from = -offsetX;
    }

    let to = -offsetX;
    spring.current.updateConfig({ fromValue: from, toValue: to }).start();
  }, [months[0]]);

  useLayoutEffect(() => {
    prevMonth0.current = months[0];
  }, [months[0]]);

  useLayoutEffect(() => {
    scrollerRef.current.style.transform = `translateX(${-monthWidth}px)`;
  }, [monthWidth]);

  return (
    <div
      {...css([
        { flex: 1, overflow: 'hidden' },
        months.length === 1 && {
          marginLeft: -4,
          marginRight: -4
        }
      ])}
      ref={containerRef}
    >
      <View
        style={{
          flexDirection: 'row',
          width: widthState,
          willChange: 'transform'
        }}
        innerRef={scrollerRef}
      >
        {allMonths.map((month, idx) => {
          return (
            <View
              key={month}
              style={[
                { flex: `0 0 ${monthWidth}px` },
                { paddingLeft: 4, paddingRight: 4 }
              ]}
            >
              <SummaryComponent month={month} />
            </View>
          );
        })}
      </View>
    </div>
  );
}
