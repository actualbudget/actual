import type { CSSProperties } from 'react';

import { Text } from '@actual-app/components/text';
import { View } from '@actual-app/components/view';
import { AutoTextSize } from 'auto-text-size';

import { PrivacyFilter } from '#components/PrivacyFilter';
import { useFormat } from '#hooks/useFormat';

import { AMOUNT_WRAPPER_STYLE } from './budgetTableStyles';

type CategoryAmountTextProps = {
  value: number;
  maxFontSizePx?: number;
  style?: CSSProperties;
  className?: string;
  getAriaLabel?: (formattedValue: string) => string;
};

export function CategoryAmountText({
  value,
  maxFontSizePx = 12,
  style,
  className,
  getAriaLabel,
}: CategoryAmountTextProps) {
  const format = useFormat();
  const formattedValue = format(value, 'financial');

  return (
    <View style={AMOUNT_WRAPPER_STYLE}>
      <PrivacyFilter>
        <AutoTextSize
          key={value}
          as={Text}
          minFontSizePx={10}
          maxFontSizePx={maxFontSizePx}
          mode="oneline"
          style={style}
          className={className}
          aria-label={getAriaLabel?.(formattedValue)}
        >
          {formattedValue}
        </AutoTextSize>
      </PrivacyFilter>
    </View>
  );
}
