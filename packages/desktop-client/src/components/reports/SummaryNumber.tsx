import React, { type Ref, useRef, useState } from 'react';

import { debounce } from 'debounce';

import { amountToCurrency } from 'loot-core/shared/util';

import { useMergedRefs } from '../../hooks/useMergedRefs';
import { useResizeObserver } from '../../hooks/useResizeObserver';
import { View } from '../common/View';
import { PrivacyFilter } from '../PrivacyFilter';

import { chartTheme } from './chart-theme';
import { LoadingIndicator } from './LoadingIndicator';

const FONT_SIZE_SCALE_FACTOR = 1.6;
const FONT_PADDING = 8;

type SummaryNumberProps = {
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
}: SummaryNumberProps) {
  const [fontSize, setFontSize] = useState<number>(initialFontSize);
  const refDiv = useRef<HTMLDivElement>(null);

  const displayAmount = amountToCurrency(Math.abs(value));
  const handleResize = debounce(() => {
    const { clientWidth, clientHeight } = refDiv.current;
    const widthWithPadding = clientWidth - FONT_PADDING * 2; // padding left and right
    const heightWithPadding = clientHeight - FONT_PADDING * 2; // padding top and bottom

    const calculatedFontSize = Math.min(
      (widthWithPadding * FONT_SIZE_SCALE_FACTOR) /
        displayAmount.toString().length,
      heightWithPadding, // Ensure the text fits vertically by using the height as the limiting factor
    );

    setFontSize(calculatedFontSize);
    fontSizeChanged(calculatedFontSize);
  }, 100);

  const ref = useResizeObserver(handleResize);
  const mergedRef = useMergedRefs(ref, refDiv);

  return (
    <>
      {loading && <LoadingIndicator />}
      {!loading && (
        <View
          ref={mergedRef as Ref<HTMLDivElement>}
          role="text"
          aria-label={`${value < 0 ? 'Negative' : 'Positive'} amount: ${displayAmount}${suffix}`}
          style={{
            alignItems: 'center',
            flexGrow: 1,
            flexShrink: 1,
            width: '100%',
            height: '100%',
            maxWidth: '100%',
            fontSize,
            lineHeight: 0.85,
            margin: FONT_PADDING,
            justifyContent: 'center',
            transition: animate ? 'font-size 0.3s ease' : '',
            color: value < 0 ? chartTheme.colors.red : chartTheme.colors.blue,
          }}
        >
          <span aria-hidden="true">
            <PrivacyFilter>
              {displayAmount}
              {suffix}
            </PrivacyFilter>
          </span>
        </View>
      )}
    </>
  );
}
