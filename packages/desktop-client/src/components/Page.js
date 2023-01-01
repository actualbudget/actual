import React from 'react';
import { useHistory } from 'react-router-dom';

import { Modal, View, Text } from 'loot-design/src/components/common';
import { styles } from 'loot-design/src/style';

let PageTypeContext = React.createContext({ type: 'page' });

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

function PageTitle({ name }) {
  return (
    <Text style={{ fontSize: 25, fontWeight: 500, marginBottom: 15 }}>
      {name}
    </Text>
  );
}

export function Page({ title, modalSize, children }) {
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
    <View style={[styles.page, { paddingLeft: 20, paddingRight: 20, flex: 1 }]}>
      <PageTitle name={title} />
      {children}
    </View>
  );
}
