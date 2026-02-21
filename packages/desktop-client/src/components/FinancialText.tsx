import React from 'react';
import type { ComponentPropsWithoutRef, ElementType } from 'react';

import { styles } from '@actual-app/components/styles';
import type { CSSProperties } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';

type FinancialTextProps<T extends ElementType = typeof Text> = {
  as?: T;
  style?: CSSProperties;
} & Omit<ComponentPropsWithoutRef<T>, 'style' | 'as'>;

export function FinancialText<T extends ElementType = typeof Text>({
  as,
  style,
  ...props
}: FinancialTextProps<T>) {
  const Component = as ?? Text;

  return <Component {...props} style={{ ...style, ...styles.tnum }} />;
}
