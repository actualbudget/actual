import React, { useState } from 'react';

import { styles, colors } from '../../style';
import { View, Block, Modal, Button, Text } from '../common';

function getErrorMessage(error) {
  switch (error) {
    case 'not-ynab4':
      return 'This file is not valid. Please select a .ynab4 file';
    default:
      return 'An unknown error occurred while importing. Please report this as a new issue on Github.';
  }
}

function Import({ modalProps, actions }) {
  const [error] = useState(false);

  function onSelectType(type) {
    switch (type) {
      case 'ynab4':
        actions.pushModal('import-ynab4');
        break;
      case 'ynab5':
        actions.pushModal('import-ynab5');
        break;
      case 'actual':
        actions.pushModal('import-actual');
        break;
      default:
    }
  }

  let itemStyle = {
    padding: 10,
    border: '1px solid ' + colors.border,
    borderRadius: 6,
    marginBottom: 10,
    display: 'block',
  };

  return (
    <Modal {...modalProps} title="Import From" style={{ width: 400 }}>
      {() => (
        <View style={[styles.smallText, { lineHeight: 1.5 }]}>
          {error && (
            <Block style={{ color: colors.r4, marginBottom: 15 }}>
              {getErrorMessage(error)}
            </Block>
          )}

          <Text style={{ marginBottom: 15 }}>
            Select an app to import from, and we’ll guide you through the
            process.
          </Text>

          <Button style={itemStyle} onClick={() => onSelectType('ynab4')}>
            <span style={{ fontWeight: 700 }}>YNAB4</span>
            <View style={{ color: colors.n5 }}>
              The old unsupported desktop app
            </View>
          </Button>
          <Button style={itemStyle} onClick={() => onSelectType('ynab5')}>
            <span style={{ fontWeight: 700 }}>nYNAB</span>
            <View style={{ color: colors.n5 }}>
              <div>The newer web app</div>
            </View>
          </Button>
          <Button style={itemStyle} onClick={() => onSelectType('actual')}>
            <span style={{ fontWeight: 700 }}>Actual</span>
            <View style={{ color: colors.n5 }}>
              <div>Import a file exported from Actual</div>
            </View>
          </Button>
        </View>
      )}
    </Modal>
  );
}

export default Import;
