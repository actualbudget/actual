// @ts-strict-ignore
import React, {
  Children,
  type ComponentProps,
  Fragment,
  cloneElement,
  forwardRef,
  isValidElement,
  type ReactElement,
  type ReactNode,
  type CSSProperties,
} from 'react';

import { Text } from './Text';
import { View } from './View';

function getChildren(
  key: string,
  children: ReactNode,
): Array<{ key: string; child: ReactElement }> {
  return Children.toArray(children).reduce(
    (list, child) => {
      if (child != null) {
        if (isValidElement(child) && child.type === Fragment) {
          const props = child.props as { children?: ReactNode } | null;
          return list.concat(
            getChildren(String(child.key ?? key), props?.children ?? []),
          );
        }
        list.push({
          key: key + (isValidElement(child) ? String(child.key ?? '') : ''),
          child: isValidElement(child) ? child : <Text>{child}</Text>,
        });
        return list;
      }
      return list;
    },
    [] as Array<{ key: string; child: ReactElement }>,
  );
}

type StackProps = ComponentProps<typeof View> & {
  direction?: CSSProperties['flexDirection'];
  align?: string;
  justify?: string;
  spacing?: number;
  debug?: boolean;
};
export const Stack = forwardRef<HTMLDivElement, StackProps>(
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
        style={{
          flexDirection: direction,
          alignItems: align,
          justifyContent: justify,
          ...style,
        }}
        innerRef={ref}
        {...props}
      >
        {validChildren.map(({ key, child }, index) => {
          const isLastChild = validChildren.length === index + 1;

          let marginProp;
          if (isHorizontal) {
            marginProp = isReversed ? 'marginLeft' : 'marginRight';
          } else {
            marginProp = isReversed ? 'marginTop' : 'marginBottom';
          }

          const element = child as ReactElement<{ style?: CSSProperties }>;
          const childProps = element.props;

          return cloneElement(element, {
            key,
            style: {
              ...(debug ? { borderWidth: 1, borderColor: 'red' } : null),
              ...(isLastChild ? null : { [marginProp]: spacing * 5 }),
              ...(childProps?.style ?? null),
            },
          });
        })}
      </View>
    );
  },
);

Stack.displayName = 'Stack';
