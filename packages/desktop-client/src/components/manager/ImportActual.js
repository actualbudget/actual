import React, { useState } from 'react';
import { useDispatch } from 'react-redux';

import { importBudget } from 'loot-core/src/client/actions/budgets';

import { styles, colors } from '../../style';
import { View, Block, Modal, ButtonWithLoading, P } from '../common';

function getErrorMessage(error) {
  switch (error) {
    case 'parse-error':
      return 'Unable to parse file. Please select a JSON file exported from nYNAB.';
    case 'not-ynab5':
      return 'This file is not valid. Please select a JSON file exported from nYNAB.';
    case 'not-zip-file':
      return 'This file is not valid. Please select an unencrypted archive of Actual data.';
    case 'invalid-zip-file':
      return 'This archive is not a valid Actual export file.';
    case 'invalid-metadata-file':
      return 'The metadata file in the given archive is corrupted.';
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
      filters: [{ name: 'actual', extensions: ['zip', 'blob'] }],
    });
    if (res) {
      setImporting(true);
      setError(false);
      try {
        await dispatch(importBudget(res[0], 'actual'));
      } catch (err) {
        setError(err.message);
      } finally {
        setImporting(false);
      }
    }
  }

  return (
    <Modal
      {...modalProps}
      title="Import from Actual export"
      style={{ width: 400 }}
    >
      {() => (
        <View style={[styles.smallText, { lineHeight: 1.5, marginTop: 20 }]}>
          {error && (
            <Block style={{ color: colors.r4, marginBottom: 15 }}>
              {getErrorMessage(error)}
            </Block>
          )}

          <View style={{ '& > div': { lineHeight: '1.7em' } }}>
            <P>
              You can import data from another Actual account or instance. First
              export your data from a different account, and it will give you a
              compressed file. This file is a simple zip file that contains the{' '}
              <code>db.sqlite</code> and <code>metadata.json</code> files.
            </P>

            <P>Select one of these compressed files and import it here.</P>

            <View style={{ alignSelf: 'center' }}>
              <ButtonWithLoading loading={importing} primary onClick={onImport}>
                Select file...
              </ButtonWithLoading>
            </View>
          </View>
        </View>
      )}
    </Modal>
  );
}

export default Import;
