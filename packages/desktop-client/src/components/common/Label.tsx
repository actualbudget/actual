import { type ReactNode } from 'react';

import { type CSSProperties } from 'glamor';

import { colors, styles } from '../../style';

import Text from './Text';

type LabelProps = {
  title: ReactNode;
  style?: CSSProperties;
};

export default function Label({ title, style }: LabelProps) {
  return (
    <Text
      style={[
        styles.text,
        {
          color: colors.n2,
          textAlign: 'right',
          fontSize: 12,
          marginBottom: 2,
        },
        style,
      ]}
    >
      {title}
    </Text>
  );
}
