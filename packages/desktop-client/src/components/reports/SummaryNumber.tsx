import React, { type Ref, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { View } from '@actual-app/components/view';
import debounce from 'lodash/debounce';

import { chartTheme } from './chart-theme';
import { LoadingIndicator } from './LoadingIndicator';

import { PrivacyFilter } from '@desktop-client/components/PrivacyFilter';
import { useFormat } from '@desktop-client/hooks/useFormat';
import { useMergedRefs } from '@desktop-client/hooks/useMergedRefs';
import { useResizeObserver } from '@desktop-client/hooks/useResizeObserver';

const FONT_SIZE_SCALE_FACTOR = 1.6;
const CONTAINER_MARGIN = 8;

type SummaryNumberProps = {
  value: number;
  contentType: string;
  animate?: boolean;
  suffix?: string;
  loading?: boolean;
  initialFontSize?: number;
  fontSizeChanged?: (fontSize: number) => void;
};

export function SummaryNumber({
  value,
  contentType,
  animate = false,
  suffix = '',
  loading = true,
  initialFontSize = 14,
  fontSizeChanged,
}: SummaryNumberProps) {
  const { t } = useTranslation();
  const [fontSize, setFontSize] = useState<number>(initialFontSize);
  const refDiv = useRef<HTMLDivElement>(null);
  const format = useFormat();

  let displayAmount =
    contentType === 'percentage'
      ? format(Math.abs(value), 'number')
      : format(Math.abs(Math.round(value)), 'financial');

  displayAmount += suffix;

  const handleResize = debounce(() => {
    if (!refDiv.current) return;

    const { clientWidth, clientHeight } = refDiv.current;
    const width = clientWidth; // no margin required on left and right
    const height = clientHeight - CONTAINER_MARGIN * 2; // account for margin top and bottom

    const calculatedFontSize = Math.min(
      (width * FONT_SIZE_SCALE_FACTOR) / displayAmount.toString().length,
      height, // Ensure the text fits vertically by using the height as the limiting factor
    );

    setFontSize(calculatedFontSize);

    if (calculatedFontSize !== initialFontSize && fontSizeChanged) {
      fontSizeChanged(calculatedFontSize);
    }
  }, 100);

  const ref = useResizeObserver(handleResize);
  const mergedRef = useMergedRefs(ref, refDiv);

  return (
    <>
      {loading && <LoadingIndicator />}
      {!loading && (
        <View
          ref={mergedRef as Ref<HTMLDivElement>}
          aria-label={
            value < 0
              ? t('Negative amount: {{amount}}', { amount: displayAmount })
              : t('Positive amount: {{amount}}', { amount: displayAmount })
          }
          style={{
            alignItems: 'center',
            flexGrow: 1,
            flexShrink: 1,
            width: '100%',
            height: '100%',
            maxWidth: '100%',
            fontSize,
            lineHeight: 1,
            margin: `${CONTAINER_MARGIN}px 0`,
            justifyContent: 'center',
            transition: animate ? 'font-size 0.3s ease' : '',
            color: value < 0 ? chartTheme.colors.red : chartTheme.colors.blue,
          }}
        >
          <span aria-hidden="true">
            <PrivacyFilter>{displayAmount}</PrivacyFilter>
          </span>
        </View>
      )}
    </>
  );
}
