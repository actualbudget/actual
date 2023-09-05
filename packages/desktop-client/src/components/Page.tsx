import React, { type ReactNode } from 'react';

import { useResponsive } from '../ResponsiveProvider';
import { colors, styles, type CSSProperties } from '../style';

import Text from './common/Text';
import View from './common/View';

function PageTitle({
  name,
  style,
}: {
  name: ReactNode;
  style?: CSSProperties;
}) {
  const { isNarrowWidth } = useResponsive();

  if (isNarrowWidth) {
    return (
      <View
        style={{
          alignItems: 'center',
          backgroundColor: colors.b2,
          color: 'white',
          flexDirection: 'row',
          flex: '1 0 auto',
          fontSize: 18,
          fontWeight: 500,
          height: 50,
          justifyContent: 'center',
          overflowY: 'auto',
          ...style,
        }}
      >
        {name}
      </View>
    );
  }

  return (
    <Text
      style={{
        fontSize: 25,
        fontWeight: 500,
        marginBottom: 15,
        ...style,
      }}
    >
      {name}
    </Text>
  );
}

export function Page({
  title,
  children,
  titleStyle,
}: {
  title: ReactNode;
  children: ReactNode;
  titleStyle?: CSSProperties;
}) {
  let { isNarrowWidth } = useResponsive();
  let HORIZONTAL_PADDING = isNarrowWidth ? 10 : 20;

  return (
    <View style={isNarrowWidth ? undefined : styles.page}>
      <PageTitle
        name={title}
        style={{
          ...titleStyle,
          paddingInline: HORIZONTAL_PADDING,
        }}
      />
      <View
        style={
          isNarrowWidth
            ? { overflowY: 'auto', padding: HORIZONTAL_PADDING }
            : {
                paddingLeft: HORIZONTAL_PADDING,
                paddingRight: HORIZONTAL_PADDING,
                flex: 1,
              }
        }
      >
        {children}
      </View>
    </View>
  );
}
