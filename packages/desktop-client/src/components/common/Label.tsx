import { forwardRef, type ReactNode, type CSSProperties } from 'react';

import { theme, styles } from '../../style';

import { Text } from './Text';

type LabelProps = {
  title: ReactNode;
  style?: CSSProperties;
};

export const Label = forwardRef<HTMLSpanElement, LabelProps>(
  ({ title, style }: LabelProps, ref) => {
    return (
      <Text
        ref={ref}
        style={{
          ...styles.text,
          color: theme.tableRowHeaderText,
          textAlign: 'right',
          fontSize: 14,
          marginBottom: 2,
          ...style,
        }}
      >
        {title}
      </Text>
    );
  },
);

Label.displayName = 'Label';
