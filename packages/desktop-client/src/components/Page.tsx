import React, { createContext, type ReactNode, useContext } from 'react';
import { useNavigate } from 'react-router-dom';

import { type CSSProperties } from 'glamor';

import { useResponsive } from '../ResponsiveProvider';
import { colors, styles } from '../style';

import Modal from './common/Modal';
import Text from './common/Text';
import View from './common/View';

let PageTypeContext = createContext({ type: 'page', current: undefined });

export function PageTypeProvider({ type, current, children }) {
  return (
    <PageTypeContext.Provider value={{ type, current }}>
      {children}
    </PageTypeContext.Provider>
  );
}

export function usePageType() {
  return useContext(PageTypeContext);
}

function PageTitle({ name, style }) {
  const { isNarrowWidth } = useResponsive();

  if (isNarrowWidth) {
    return (
      <View
        style={[
          {
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
          },
          style,
        ]}
      >
        {name}
      </View>
    );
  }

  return (
    <Text
      style={[
        {
          fontSize: 25,
          fontWeight: 500,
          marginBottom: 15,
        },
        style,
      ]}
    >
      {name}
    </Text>
  );
}

export function Page({
  title,
  modalSize,
  children,
  titleStyle,
}: {
  title: string;
  modalSize?: string | { width: number; height?: number };
  children: ReactNode;
  titleStyle?: CSSProperties;
}) {
  let { type, current } = usePageType();
  let navigate = useNavigate();
  let { isNarrowWidth } = useResponsive();
  let HORIZONTAL_PADDING = isNarrowWidth ? 10 : 20;

  if (type === 'modal') {
    let size =
      typeof modalSize === 'string'
        ? modalSize === 'medium'
          ? { width: 750, height: 600 }
          : { width: 600 }
        : modalSize;

    return (
      <Modal
        title={title}
        isCurrent={current}
        size={size}
        onClose={() => navigate(-1)}
      >
        {children}
      </Modal>
    );
  }

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
