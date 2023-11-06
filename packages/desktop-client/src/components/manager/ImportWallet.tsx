import React, { useState } from 'react';
import { useDispatch } from 'react-redux';

import { importBudget } from 'loot-core/src/client/actions/budgets';

import { styles, theme } from '../../style';
import Block from '../common/Block';
import { ButtonWithLoading } from '../common/Button';
import Modal, { type ModalProps } from '../common/Modal';
import Paragraph from '../common/Paragraph';
import View from '../common/View';

function getErrorMessage(error: string): string {
  switch (error) {
    case 'parse-error':
      return 'Unable to parse file. Please select a CSV file exported from Wallet.';
    default:
      return 'An unknown error occurred while importing. Please report this as a new issue on Github.';
  }
}

type ImportProps = {
  modalProps?: ModalProps;
};

function Import({ modalProps }: ImportProps) {
  const dispatch = useDispatch();
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  async function onImport() {
    const res = await window.Actual.openFileDialog({
      properties: ['openFile'],
      filters: [{ name: 'wallet', extensions: ['csv'] }],
    });
    if (res) {
      setImporting(true);
      setError(null);
      try {
        await dispatch(importBudget(res[0], 'wallet'));
      } catch (err) {
        setError(err.message);
      } finally {
        setImporting(false);
      }
    }
  }

  return (
    <Modal {...modalProps} title="Import from Wallet" style={{ width: 400 }}>
      {() => (
        <View style={{ ...styles.smallText, lineHeight: 1.5, marginTop: 20 }}>
          {error && (
            <Block style={{ color: theme.errorText, marginBottom: 15 }}>
              {getErrorMessage(error)}
            </Block>
          )}

          <View
            style={{
              '& > div': { lineHeight: '1.7em' },
            }}
          >
            <Paragraph>
              To import correctly from the Budgetbakers&rsquo; Wallet app, you
              need to go to the side menu, then expand other and click Export.
              Then select the accounts you want to include in the import, the
              transaction type Both, the time range, tick Include Transfers and
              select CSV.
            </Paragraph>

            <Paragraph>
              Use the CSV file created this way in this importer.
            </Paragraph>

            <Paragraph>
              NOTE: It is recommended that you select all accounts so that the
              importer can accurately link transfers between accounts.
            </Paragraph>

            <View>
              <ButtonWithLoading
                type="primary"
                loading={importing}
                onClick={onImport}
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

export default Import;
