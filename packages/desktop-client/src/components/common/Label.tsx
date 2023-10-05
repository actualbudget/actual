import { type ReactNode } from 'react';

import { type CSSProperties, theme, styles } from '../../style';

import Text from './Text';

type LabelProps = {
  title: ReactNode;
  style?: CSSProperties;
};

export default function Label({ title, style }: LabelProps) {
  return (
    <Text
      style={{
        ...styles.text,
        color: theme.tableRowHeaderText,
        textAlign: 'right',
        fontSize: 12,
        marginBottom: 2,
        ...style,
      }}
    >
      {title}
    </Text>
  );
}
