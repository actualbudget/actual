// @ts-strict-ignore
import React, { useState } from 'react';
import { useDispatch } from 'react-redux';

import { importBudget } from 'loot-core/src/client/actions/budgets';

import { styles, theme } from '../../style';
import { Block } from '../common/Block';
import { ButtonWithLoading } from '../common/Button2';
import { Modal, type ModalProps } from '../common/Modal';
import { Paragraph } from '../common/Paragraph';
import { View } from '../common/View';

function getErrorMessage(error: string): string {
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

type ImportProps = {
  modalProps?: ModalProps;
};

export function ImportActual({ modalProps }: ImportProps) {
  const dispatch = useDispatch();
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  async function onImport() {
    const res = await window.Actual?.openFileDialog({
      properties: ['openFile'],
      filters: [{ name: 'actual', extensions: ['zip', 'blob'] }],
    });
    if (res) {
      setImporting(true);
      setError(null);
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
        <View style={{ ...styles.smallText, lineHeight: 1.5, marginTop: 20 }}>
          {error && (
            <Block style={{ color: theme.errorText, marginBottom: 15 }}>
              {getErrorMessage(error)}
            </Block>
          )}

          <View style={{ '& > div': { lineHeight: '1.7em' } }}>
            <Paragraph>
              You can import data from another Actual account or instance. First
              export your data from a different account, and it will give you a
              compressed file. This file is a simple zip file that contains the{' '}
              <code>db.sqlite</code> and <code>metadata.json</code> files.
            </Paragraph>

            <Paragraph>
              Select one of these compressed files and import it here.
            </Paragraph>

            <View style={{ alignSelf: 'center' }}>
              <ButtonWithLoading
                variant="primary"
                isLoading={importing}
                onPress={onImport}
              >
                Select file...
              </ButtonWithLoading>
            </View>
          </View>
        </View>
      )}
    </Modal>
  );
}
