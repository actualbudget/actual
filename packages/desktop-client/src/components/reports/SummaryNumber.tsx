import React, { type Ref, useRef, useState } from 'react';

import { amountToCurrency } from 'loot-core/shared/util';

import { useMergedRefs } from '../../hooks/useMergedRefs';
import { useResizeObserver } from '../../hooks/useResizeObserver';
import { View } from '../common/View';
import { PrivacyFilter } from '../PrivacyFilter';

import { chartTheme } from './chart-theme';
import { LoadingIndicator } from './LoadingIndicator';

type AnimatedNumberProps = {
  value: number;
  animate?: boolean;
  suffix?: string;
  loading?: boolean;
};

export function SummaryNumber({
  value,
  animate = true,
  suffix = '',
  loading = true,
}: AnimatedNumberProps) {
  const [fontSize, setFontSize] = useState<number>(0);
  const refDiv = useRef<HTMLDivElement>(null);
  const offScreenRef = useRef<HTMLDivElement>(null);

const adjustFontSize = (containerWidth: number, containerHeight: number) => {
    if (!offScreenRef.current) return;

    const MIN_FONT_SIZE = 14;
    const MAX_FONT_SIZE = 100;
    let low = MIN_FONT_SIZE;
    let high = MAX_FONT_SIZE;
    const offScreenDiv = offScreenRef.current;

    // Binary search for the optimal font size
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      offScreenDiv.style.fontSize = `${mid}px`;
      
      if (offScreenDiv.scrollWidth <= containerWidth && 
          offScreenDiv.scrollHeight <= containerHeight) {
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }

    setFontSize(high);
  };

  //const handleResize = debounce(, 0);

  const ref = useResizeObserver((rect: DOMRectReadOnly) => {
    adjustFontSize(rect.width, rect.height);
  });
  const mergedRef = useMergedRefs(ref, refDiv);

  return (
    <>
      {loading && <LoadingIndicator />}
      {!loading && (
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
            <PrivacyFilter>
              {amountToCurrency(value)}
              {suffix}
            </PrivacyFilter>
          </div>

          <View
            ref={mergedRef as Ref<HTMLDivElement>}
            role="text"
            aria-label={`${value < 0 ? 'Negative' : 'Positive'} amount: ${amountToCurrency(Math.abs(value))}${suffix}`}
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
            <span aria-hidden="true">
              <PrivacyFilter>
                {amountToCurrency(Math.abs(value))}
                {suffix}
              </PrivacyFilter>
            </span>
          </View>
        </>
      )}
    </>
  );
}
