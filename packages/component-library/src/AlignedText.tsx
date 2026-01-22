import { type ComponentProps, type CSSProperties, type ReactNode } from 'react';

import { Block } from './Block';
import { View } from './View';

type AlignedTextProps = ComponentProps<typeof View> & {
  left: ReactNode;
  right: ReactNode;
  style?: CSSProperties;
  leftStyle?: CSSProperties;
  rightStyle?: CSSProperties;
  truncate?: 'left' | 'right';
};
export function AlignedText({
  left,
  right,
  style,
  leftStyle,
  rightStyle,
  truncate = 'left',
  ...nativeProps
}: AlignedTextProps) {
  const truncateStyle: CSSProperties = {
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
  };

  return (
    <View
      style={{ flexDirection: 'row', alignItems: 'center', ...style }}
      {...nativeProps}
    >
      <Block
        style={{
          marginRight: 10,
          ...(truncate === 'left' && truncateStyle),
          ...leftStyle,
        }}
      >
        {left}
      </Block>
      <Block
        style={{
          flex: 1,
          textAlign: 'right',
          ...(truncate === 'right' && truncateStyle),
          ...rightStyle,
        }}
      >
        {right}
      </Block>
    </View>
  );
}
