import { type ComponentProps } from 'react';

import { type CSSProperties } from 'glamor';

import Block from './Block';
import View from './View';

type AlignedTextProps = ComponentProps<typeof View> & {
  left;
  right;
  style?: CSSProperties;
  leftStyle?: CSSProperties;
  rightStyle?: CSSProperties;
  truncate?: 'left' | 'right';
};
export default function AlignedText({
  left,
  right,
  style,
  leftStyle,
  rightStyle,
  truncate = 'left',
  ...nativeProps
}: AlignedTextProps) {
  const truncateStyle = {
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
  };

  return (
    <View
      style={[{ flexDirection: 'row', alignItems: 'center' }, style]}
      {...nativeProps}
    >
      <Block
        style={[
          { marginRight: 10 },
          truncate === 'left' && truncateStyle,
          leftStyle,
        ]}
      >
        {left}
      </Block>
      <Block
        style={[
          { flex: 1, textAlign: 'right' },
          truncate === 'right' && truncateStyle,
          rightStyle,
        ]}
      >
        {right}
      </Block>
    </View>
  );
}
