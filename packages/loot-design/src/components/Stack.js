import React from 'react';

import Text from './Text';
import View from './View';

function getChildren(key, children) {
  return React.Children.toArray(children).reduce((list, child) => {
    if (child) {
      if (child.type === React.Fragment) {
        return list.concat(getChildren(child.key, child.props.children));
      }
      list.push({ key: key + child.key, child });
      return list;
    }
    return list;
  }, []);
}

const Stack = React.forwardRef(
  (
    {
      direction = 'column',
      align,
      justify,
      spacing = 3,
      children,
      debug,
      style
    },
    ref
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
            justifyContent: justify
          },
          style
        ]}
        innerRef={ref}
      >
        {validChildren.map(({ key, child }, index) => {
          let isLastChild = validChildren.length === index + 1;

          let marginProp;
          if (isHorizontal) {
            marginProp = isReversed ? 'marginLeft' : 'marginRight';
          } else {
            marginProp = isReversed ? 'marginTop' : 'marginBottom';
          }

          return React.cloneElement(
            typeof child === 'string' ? <Text>{child}</Text> : child,
            {
              key,
              style: [
                debug && { borderWidth: 1, borderColor: 'red' },
                isLastChild ? null : { [marginProp]: spacing * 5 },
                child.props ? child.props.style : null
              ]
            }
          );
        })}
      </View>
    );
  }
);

export default Stack;
