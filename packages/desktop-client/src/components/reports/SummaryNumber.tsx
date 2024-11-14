import React, { type Ref, useRef, useState } from 'react';

import { debounce } from 'debounce';

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
  initialFontSize?: number;
  fontSizeChanged?: (fontSize: number) => void;
};

export function SummaryNumber({
  value,
  animate = false,
  suffix = '',
  loading = true,
  initialFontSize = 14,
  fontSizeChanged,
}: AnimatedNumberProps) {
  const [fontSize, setFontSize] = useState<number>(0);
  const refDiv = useRef<HTMLDivElement>(null);
  const offScreenRef = useRef<HTMLDivElement>(null);

  const adjustFontSize = (containerWidth: number, containerHeight: number) => {
    if (!offScreenRef.current) return;

    let testFontSize = initialFontSize;
    const offScreenDiv = offScreenRef.current;
    offScreenDiv.style.fontSize = `${testFontSize}px`;

    if (
      offScreenDiv.scrollWidth > containerWidth ||
      offScreenDiv.scrollHeight > containerHeight
    ) {
      while (
        offScreenDiv.scrollWidth > containerWidth &&
        offScreenDiv.scrollHeight > containerHeight
      ) {
        testFontSize -= 0.5;
        offScreenDiv.style.fontSize = `${testFontSize}px`;
      }
    } else if (
      offScreenDiv.scrollWidth <= containerWidth * 0.9 &&
      offScreenDiv.scrollHeight <= containerHeight * 0.9
    ) {
      while (
        offScreenDiv.scrollWidth <= containerWidth &&
        offScreenDiv.scrollHeight <= containerHeight
      ) {
        testFontSize += 0.5;
        offScreenDiv.style.fontSize = `${testFontSize}px`;
      }
    }

    setFontSize(testFontSize);
    if (initialFontSize !== testFontSize && fontSizeChanged) {
      fontSizeChanged(testFontSize);
    }
  };

  const handleResize = debounce((rect: DOMRectReadOnly) => {
    adjustFontSize(rect.width, rect.height);
  }, 150);

  const ref = useResizeObserver(handleResize);
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
              padding: 16,
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
              padding: 16,
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
