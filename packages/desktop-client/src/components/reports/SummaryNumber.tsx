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

  const FONT_SIZE_SCALE_FACTOR = 0.8;
  const MAX_RECURSION_DEPTH = 10;

  const adjustFontSizeBinary = (minFontSize: number, maxFontSize: number) => {
    if (!offScreenRef.current || !refDiv.current) return;

    const offScreenDiv = offScreenRef.current;
    const refDivCurrent = refDiv.current;

    const binarySearchFontSize = (min: number, max: number, depth = 0) => {
      if (depth >= MAX_RECURSION_DEPTH) {
        setFontSize(min);
        return;
      }

      const testFontSize = (min + max) / 2;
      offScreenDiv.style.fontSize = `${testFontSize}px`;

      let frameId: number;
      requestAnimationFrame(() => {
        const isOverflowing =
          offScreenDiv.scrollWidth > refDivCurrent.clientWidth ||
          offScreenDiv.scrollHeight > refDivCurrent.clientHeight;

        if (isOverflowing) {
          frameId = requestAnimationFrame(() => 
            binarySearchFontSize(min, testFontSize, depth + 1)
          );
        } else {
          const isUnderflowing =
            offScreenDiv.scrollWidth <= refDivCurrent.clientWidth *
              FONT_SIZE_SCALE_FACTOR &&
            offScreenDiv.scrollHeight <= refDivCurrent.clientHeight *
              FONT_SIZE_SCALE_FACTOR;

          if (isUnderflowing && testFontSize < max) {
            frameId = requestAnimationFrame(() => 
              binarySearchFontSize(testFontSize, max, depth + 1)
            );
          } else {
            setFontSize(testFontSize);
            if (initialFontSize !== testFontSize && fontSizeChanged) {
              fontSizeChanged(testFontSize);
            }
          }
        }
      });
      
      return () => {
        if (frameId) {
          cancelAnimationFrame(frameId);
        }
      };
    };

    binarySearchFontSize(minFontSize, maxFontSize);
  };

  const handleResize = debounce(() => {
    adjustFontSizeBinary(14, 100);
  }, 100);

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
              fontSize: `${initialFontSize}px`,
              visibility: 'hidden',
              whiteSpace: 'nowrap',
              padding: 8,
            }}
          >
            <PrivacyFilter>
              {amountToCurrency(Math.abs(value))}
              {suffix}
            </PrivacyFilter>
          </div>

          <View
            ref={mergedRef as Ref<HTMLDivElement>}
            id="test"
            role="text"
            aria-label={`${value < 0 ? 'Negative' : 'Positive'} amount: ${amountToCurrency(Math.abs(value))}${suffix}`}
            style={{
              alignItems: 'center',
              flexGrow: 1,
              flexShrink: 1,
              width: '100%',
              maxWidth: '100%',
              fontSize: `${fontSize}px`,
              padding: 8,
              justifyContent: 'center',
              transition: animate ? 'font-size 0.3s ease' : '',
              color: value < 0 ? chartTheme.colors.red : chartTheme.colors.blue,
            }}
          >
            <span aria-hidden="true" id="coiso">
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
