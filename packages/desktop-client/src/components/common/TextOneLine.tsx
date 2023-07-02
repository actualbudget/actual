import { type ComponentProps } from 'react';

import Text from './Text';

type TextOneLineProps = ComponentProps<typeof Text>;

export default function TextOneLine({ children, ...props }: TextOneLineProps) {
  return (
    <Text
      {...props}
      style={[
        props.style,
        {
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          display: 'block',
        },
      ]}
    >
      {children}
    </Text>
  );
}
