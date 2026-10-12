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
  'aria-label'?: string;
};

export function CategoryAmountText({
  value,
  maxFontSizePx = 12,
  style,
  className,
  'aria-label': ariaLabel,
}: CategoryAmountTextProps) {
  const format = useFormat();

  return (
    <View style={AMOUNT_WRAPPER_STYLE}>
      <PrivacyFilter>
        <AutoTextSize
          key={value}
          as={Text}
          minFontSizePx={6}
          maxFontSizePx={maxFontSizePx}
          mode="oneline"
          style={style}
          className={className}
          aria-label={ariaLabel}
        >
          {format(value, 'financial')}
        </AutoTextSize>
      </PrivacyFilter>
    </View>
  );
}
