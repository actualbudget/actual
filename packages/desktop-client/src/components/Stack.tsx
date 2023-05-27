import React, {
  Children,
  type ComponentProps,
  Fragment,
  cloneElement,
  forwardRef,
  type ReactNode,
} from 'react';

import Text from './common/Text';
import View from './common/View';

function getChildren(key, children) {
  return Children.toArray(children).reduce((list, child) => {
    if (child) {
      if (
        typeof child === 'object' &&
        'type' in child &&
        child.type === Fragment
      ) {
        return list.concat(getChildren(child.key, child.props.children));
      }
      list.push({ key: key + child['key'], child });
      return list;
    }
    return list;
  }, [] as Array<{ key: string; child: ReactNode }>);
}

type StackProps = ComponentProps<typeof View> & {
  direction?: string;
  align?: string;
  justify?: string;
  spacing?: number;
  debug?: boolean;
};
const Stack = forwardRef<HTMLDivElement, StackProps>(
  (
    {
      direction = 'column',
      align,
      justify,
      spacing = 3,
      children,
      debug,
      style,
      ...props
    },
    ref,
  ) => {
    const isReversed = direction.endsWith('reverse');
    const isHorizontal = direction.startsWith('row');
    const validChildren = getChildren('', children);

    return (
      <View
        style={[
          {
            flexDirection: direction,
            alignItems: align,
            justifyContent: justify,
          },
          style,
        ]}
        innerRef={ref}
        {...props}
      >
        {validChildren.map(({ key, child }, index) => {
          let isLastChild = validChildren.length === index + 1;

          let marginProp;
          if (isHorizontal) {
            marginProp = isReversed ? 'marginLeft' : 'marginRight';
          } else {
            marginProp = isReversed ? 'marginTop' : 'marginBottom';
          }

          return cloneElement(
            typeof child === 'string' ? <Text>{child}</Text> : child,
            {
              key,
              style: [
                debug && { borderWidth: 1, borderColor: 'red' },
                isLastChild ? null : { [marginProp]: spacing * 5 },
                child.props ? child.props.style : null,
              ],
            },
          );
        })}
      </View>
    );
  },
);

export default Stack;
