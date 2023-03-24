import React from 'react';

import { Modal, P, View } from '../common';

export default function NordigenLink() {
  window.close();

  return (
    <Modal isCurrent={true} showClose={false} title="Account sync">
      {() => (
        <View style={{ maxWidth: 500 }}>
          <P>Please wait...</P>
          <P>
            The window should close automatically. If nothing happend you can
            close this window or tab.
          </P>
        </View>
      )}
    </Modal>
  );
}
