// @ts-strict-ignore
import React, { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { importBudget } from 'loot-core/client/budgets/budgetsSlice';

import { useNavigate } from '../../../hooks/useNavigate';
import { useDispatch } from '../../../redux';
import { styles, theme } from '../../../style';
import { Block } from '../../common/Block';
import { ButtonWithLoading } from '../../common/Button2';
import { Modal, ModalCloseButton, ModalHeader } from '../../common/Modal';
import { Paragraph } from '../../common/Paragraph';
import { View } from '../../common/View';

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
      return 'An unknown error occurred while importing. Please report this as a new issue on GitHub.';
  }
}

export function ImportActualModal() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  async function onImport() {
    const res = await window.Actual.openFileDialog({
      properties: ['openFile'],
      filters: [{ name: 'actual', extensions: ['zip', 'blob'] }],
    });
    if (res) {
      setImporting(true);
      setError(null);
      try {
        await dispatch(importBudget({ filepath: res[0], type: 'actual' }));
        navigate('/budget');
      } catch (err) {
        setError(err.message);
      } finally {
        setImporting(false);
      }
    }
  }

  return (
    <Modal name="import-actual" containerProps={{ style: { width: 400 } }}>
      {({ state: { close } }) => (
        <>
          <ModalHeader
            title={t('Import from Actual export')}
            rightContent={<ModalCloseButton onPress={close} />}
          />
          <View style={{ ...styles.smallText, lineHeight: 1.5, marginTop: 20 }}>
            {error && (
              <Block style={{ color: theme.errorText, marginBottom: 15 }}>
                {getErrorMessage(error)}
              </Block>
            )}

            <View style={{ '& > div': { lineHeight: '1.7em' } }}>
              <Paragraph>
                <Trans>
                  You can import data from another Actual account or instance.
                  First export your data from a different account, and it will
                  give you a compressed file. This file is a simple zip file
                  that contains the <code>db.sqlite</code> and{' '}
                  <code>metadata.json</code> files.
                </Trans>
              </Paragraph>

              <Paragraph>
                <Trans>
                  Select one of these compressed files and import it here.
                </Trans>
              </Paragraph>

              <View style={{ alignSelf: 'center' }}>
                <ButtonWithLoading
                  variant="primary"
                  autoFocus
                  isLoading={importing}
                  onPress={onImport}
                >
                  <Trans>Select file...</Trans>
                </ButtonWithLoading>
              </View>
            </View>
          </View>
        </>
      )}
    </Modal>
  );
}
