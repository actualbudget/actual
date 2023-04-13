import React from 'react';
import { useHistory } from 'react-router-dom';

import { colors, styles } from '../style';
import { isMobile } from '../util';

import { Modal, View, Text } from './common';

let PageTypeContext = React.createContext({ type: 'page' });

const HORIZONTAL_PADDING = isMobile() ? 10 : 20;

export function PageTypeProvider({ type, current, children }) {
  return (
    <PageTypeContext.Provider value={{ type, current }}>
      {children}
    </PageTypeContext.Provider>
  );
}

export function usePageType() {
  return React.useContext(PageTypeContext);
}

function PageTitle({ name, style }) {
  if (isMobile()) {
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
          paddingLeft: HORIZONTAL_PADDING,
          paddingRight: HORIZONTAL_PADDING,
          marginBottom: 15,
        },
        style,
      ]}
    >
      {name}
    </Text>
  );
}

export function Page({ title, modalSize, children, titleStyle }) {
  let { type, current } = usePageType();
  let history = useHistory();

  if (type === 'modal') {
    let size = modalSize;
    if (typeof modalSize === 'string') {
      size =
        modalSize === 'medium' ? { width: 750, height: 600 } : { width: 600 };
    }

    return (
      <Modal
        title={title}
        isCurrent={current}
        size={size}
        onClose={() => history.goBack()}
      >
        {children}
      </Modal>
    );
  }

  return (
    <View style={isMobile() ? undefined : styles.page}>
      <PageTitle name={title} style={titleStyle} />
      <View
        style={
          isMobile()
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
