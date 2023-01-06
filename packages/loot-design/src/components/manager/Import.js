import React, { useState } from 'react';

import { styles, colors } from '../../style';
import { View, Block, Modal, Button } from '../common';

function getErrorMessage(error) {
  switch (error) {
    case 'not-ynab4':
      return 'This file is not valid. Please select a .ynab4 file';
    default:
      return 'An unknown error occurred while importing. Sorry! We have been notified of this issue.';
  }
}

// const res = await window.Actual.openFileDialog({
//   // Windows treats the ynab4 file as a directroy, while Mac
//   // treats it like a normal file
//   properties: ['openDirectory', 'openFile'],
//   filters: [{ name: 'ynab', extensions: ['ynab4'] }]
// });
// if (res) {
//   this.doImport(res[0]);
// }
// this.props.actions.importBudget(filepath).catch(err => {
//   this.setState({ error: err.message, importing: false });
// });

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
    display: 'block'
  };

  return (
    <Modal
      {...modalProps}
      noAnimation={true}
      showHeader={false}
      showOverlay={false}
      style={{ width: 400 }}
    >
      {() => (
        <View style={[styles.smallText, { lineHeight: 1.5, marginTop: 20 }]}>
          {error && (
            <Block style={{ color: colors.r4, marginBottom: 15 }}>
              {getErrorMessage(error)}
            </Block>
          )}

          <View>
            <View style={{ fontSize: 25, fontWeight: 700, marginBottom: 20 }}>
              Import from:
            </View>

            <View>
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
          </View>

          <View
            style={{
              flexDirection: 'row',
              marginTop: 20,
              alignItems: 'center'
            }}
          >
            <View style={{ flex: 1 }} />
            <Button
              style={{ marginRight: 10 }}
              onClick={() => modalProps.onBack()}
            >
              Back
            </Button>
          </View>
        </View>
      )}
    </Modal>
  );
}

export default Import;
