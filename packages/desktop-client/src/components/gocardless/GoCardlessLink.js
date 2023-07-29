import React from 'react';

import { Modal, View } from '../common';
import Paragraph from '../common/Paragraph';

export default function GoCardlessLink() {
  window.close();

  return (
    <Modal isCurrent={true} showClose={false} title="Account sync">
      {() => (
        <View style={{ maxWidth: 500 }}>
          <Paragraph>Please wait...</Paragraph>
          <Paragraph>
            The window should close automatically. If nothing happend you can
            close this window or tab.
          </Paragraph>
        </View>
      )}
    </Modal>
  );
}
