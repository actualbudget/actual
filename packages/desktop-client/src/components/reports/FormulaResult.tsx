import React, { useMemo } from 'react';

import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { amountToInteger } from '@actual-app/core/shared/util';

import { PrivacyFilter } from '#components/PrivacyFilter';
import { useFormat } from '#hooks/useFormat';

import { ReportCardValueSkeleton } from './ReportCardValueSkeleton';

const FONT_SIZE_SCALE_FACTOR = 1.6;
const CONTAINER_MARGIN = 8;

type FormulaResultProps = {
  value: number | string | null;
  loading?: boolean;
  error?: string | null;
  fontSizeMode?: 'dynamic' | 'static';
  staticFontSize?: number;
  customColor?: string | null;
};

export function FormulaResult({
  value,
  loading = true,
  error = null,
  fontSizeMode = 'dynamic',
  staticFontSize = 32,
  customColor = null,
}: FormulaResultProps) {
  const format = useFormat();

  // Format the display value - just show what we got
  const displayValue = useMemo(() => {
    if (error) {
      return error;
    } else if (value === null || value === undefined) {
      return '';
    } else if (typeof value === 'number') {
      return format(
        amountToInteger(value, format.currency.decimalPlaces),
        'financial',
      );
    } else {
      return String(value);
    }
  }, [error, value, format]);

  const lines = displayValue.split(/\r?\n/);
  const lineCount = lines.length;
  const longestLineLength = Math.max(...lines.map(line => line.length), 1);
  const fontSize =
    fontSizeMode === 'static'
      ? `${staticFontSize}px`
      : `min(${(FONT_SIZE_SCALE_FACTOR * 100) / longestLineLength}cqi, calc(${100 / lineCount}cqb - ${CONTAINER_MARGIN * 2}px))`;

  // Determine color
  const color = customColor
    ? customColor
    : error
      ? theme.errorText
      : theme.pageText;

  return (
    <View style={{ flex: 1, width: '100%', containerType: 'size' }}>
      {loading && <ReportCardValueSkeleton />}
      {!loading && (
        <View
          aria-label={displayValue}
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
            color,
          }}
        >
          <span
            aria-hidden="true"
            style={{
              whiteSpace: 'pre-wrap',
              textAlign: 'center',
              wordBreak: 'break-word',
            }}
          >
            <PrivacyFilter>{displayValue}</PrivacyFilter>
          </span>
        </View>
      )}
    </View>
  );
}
