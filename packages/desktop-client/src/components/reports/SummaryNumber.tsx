import React, { type Ref, useRef, useState } from 'react';

import debounce from 'lodash/debounce';

import { amountToCurrency } from 'loot-core/shared/util';

import { useMergedRefs } from '../../hooks/useMergedRefs';
import { useResizeObserver } from '../../hooks/useResizeObserver';
import { View } from '../common/View';

import { chartTheme } from './chart-theme';

type AnimatedNumberProps = {
  value: number;
  animate?: boolean;
  suffix?: string;
};

export function SummaryNumber({
  value,
  animate = true,
  suffix = '',
}: AnimatedNumberProps) {
  const [fontSize, setFontSize] = useState<number>(0);
  const refDiv = useRef<HTMLDivElement>(null);
  const offScreenRef = useRef<HTMLDivElement>(null);

  const adjustFontSize = (containerWidth: number, containerHeight: number) => {
    if (!offScreenRef.current) return;

    let testFontSize = 14;
    const offScreenDiv = offScreenRef.current;
    offScreenDiv.style.fontSize = `${testFontSize}px`;

    while (
      offScreenDiv.scrollWidth <= containerWidth &&
      offScreenDiv.scrollHeight <= containerHeight
    ) {
      testFontSize += 0.5;
      offScreenDiv.style.fontSize = `${testFontSize}px`;
    }

    setFontSize(testFontSize);
  };

  const handleResize = debounce((rect: DOMRectReadOnly) => {
    adjustFontSize(rect.width, rect.height);
  }, 10);

  const ref = useResizeObserver(handleResize);
  const mergedRef = useMergedRefs(ref, refDiv);

  return (
    <>
      <div
        ref={offScreenRef}
        style={{
          position: 'fixed',
          left: '-999px',
          top: '-999px',
          fontSize: '14px',
          visibility: 'hidden',
          whiteSpace: 'nowrap',
        }}
      >
        {amountToCurrency(value)}
        {suffix}
      </div>

      {/* Visible element */}
      <View
        ref={mergedRef as Ref<HTMLDivElement>}
        style={{
          alignItems: 'center',
          height: '100%',
          width: '100%',
          fontSize: `${fontSize}px`,
          justifyContent: 'center',
          transition: animate ? 'font-size 0.3s ease' : '',
          color: value < 0 ? chartTheme.colors.red : chartTheme.colors.blue,
        }}
      >
        <span>
          {amountToCurrency(Math.abs(value))}
          {suffix}
        </span>
      </View>
    </>
  );
}
