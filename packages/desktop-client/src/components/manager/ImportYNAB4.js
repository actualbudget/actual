import React, { useState } from 'react';
import { useDispatch } from 'react-redux';

import { importBudget } from 'loot-core/src/client/actions/budgets';

import { styles, colors } from '../../style';
import { View, Block, Modal, ButtonWithLoading, P } from '../common';

function getErrorMessage(error) {
  switch (error) {
    case 'not-ynab4':
      return 'This file is not valid. Please select a compressed ynab4 zip file.';
    default:
      return 'An unknown error occurred while importing. Please report this as a new issue on Github.';
  }
}

function Import({ modalProps, availableImports }) {
  const dispatch = useDispatch();
  const [error, setError] = useState(false);
  const [importing, setImporting] = useState(false);

  async function onImport() {
    const res = await window.Actual.openFileDialog({
      properties: ['openFile'],
      filters: [{ name: 'ynab', extensions: ['zip'] }],
    });
    if (res) {
      setImporting(true);
      setError(false);
      try {
        await dispatch(importBudget(res[0], 'ynab4'));
      } catch (err) {
        setError(err.message);
      } finally {
        setImporting(false);
      }
    }
  }

  return (
    <Modal {...modalProps} title="Import from YNAB4" style={{ width: 400 }}>
      {() => (
        <View style={[styles.smallText, { lineHeight: 1.5, marginTop: 20 }]}>
          {error && (
            <Block style={{ color: colors.r4, marginBottom: 15 }}>
              {getErrorMessage(error)}
            </Block>
          )}

          <View style={{ alignItems: 'center' }}>
            <P>
              To import data from YNAB4, locate where your YNAB4 data is stored.
              It is usually in your Documents folder under YNAB. Your data is a
              directory inside that with the <code>.ynab4</code> suffix.
            </P>
            <P>
              When you’ve located your data,{' '}
              <strong>compress it into a zip file</strong>. On macOS,
              right-click the folder and select “Compress”. On Windows,
              right-click and select “Send to &rarr; Compressed (zipped)
              folder”. Upload the zipped folder for importing.
            </P>
            <View>
              <ButtonWithLoading loading={importing} primary onClick={onImport}>
                Select zip file...
              </ButtonWithLoading>
            </View>
          </View>
        </View>
      )}
    </Modal>
  );
}

export default Import;
