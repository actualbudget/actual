import type { CSSProperties } from 'react';

import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { View } from '@actual-app/components/view';
import { AutoTextSize } from 'auto-text-size';

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
  const label = getAriaLabel?.(formattedValue);

  return (
    <View style={AMOUNT_WRAPPER_STYLE}>
      {label != null && <Text style={styles.visuallyHidden}>{label}</Text>}
      <AutoTextSize
        key={value}
        as={Text}
        minFontSizePx={10}
        maxFontSizePx={maxFontSizePx}
        mode="oneline"
        style={style}
        className={className}
        aria-hidden={label != null ? true : undefined}
      >
        {formattedValue}
      </AutoTextSize>
    </View>
  );
}
