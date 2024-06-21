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
    case 'not-ynab4':
      return 'This file is not valid. Please select a compressed ynab4 zip file.';
    default:
      return 'An unknown error occurred while importing. Please report this as a new issue on Github.';
  }
}

type ImportProps = {
  modalProps?: ModalProps;
};

export function ImportYNAB4({ modalProps }: ImportProps) {
  const dispatch = useDispatch();
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  async function onImport() {
    const res = await window.Actual?.openFileDialog({
      properties: ['openFile'],
      filters: [{ name: 'ynab', extensions: ['zip'] }],
    });
    if (res) {
      setImporting(true);
      setError(null);
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
        <View style={{ ...styles.smallText, lineHeight: 1.5, marginTop: 20 }}>
          {error && (
            <Block style={{ color: theme.errorText, marginBottom: 15 }}>
              {getErrorMessage(error)}
            </Block>
          )}

          <View style={{ alignItems: 'center' }}>
            <Paragraph>
              To import data from YNAB4, locate where your YNAB4 data is stored.
              It is usually in your Documents folder under YNAB. Your data is a
              directory inside that with the <code>.ynab4</code> suffix.
            </Paragraph>
            <Paragraph>
              When you’ve located your data,{' '}
              <strong>compress it into a zip file</strong>. On macOS,
              right-click the folder and select “Compress”. On Windows,
              right-click and select “Send to &rarr; Compressed (zipped)
              folder”. Upload the zipped folder for importing.
            </Paragraph>
            <View>
              <ButtonWithLoading
                variant="primary"
                aria-label="Select zip file"
                isLoading={importing}
                onPress={onImport}
              >
                Select zip file...
              </ButtonWithLoading>
            </View>
          </View>
        </View>
      )}
    </Modal>
  );
}
