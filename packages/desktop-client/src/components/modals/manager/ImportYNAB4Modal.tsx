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
    case 'not-ynab4':
      return 'This file is not valid. Please select a compressed ynab4 zip file.';
    default:
      return 'An unknown error occurred while importing. Please report this as a new issue on GitHub.';
  }
}

export function ImportYNAB4Modal() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  async function onImport() {
    const res = await window.Actual.openFileDialog({
      properties: ['openFile'],
      filters: [{ name: 'ynab', extensions: ['zip'] }],
    });
    if (res) {
      setImporting(true);
      setError(null);
      try {
        await dispatch(importBudget({ filepath: res[0], type: 'ynab4' }));
        navigate('/budget');
      } catch (err) {
        setError(err.message);
      } finally {
        setImporting(false);
      }
    }
  }

  return (
    <Modal name="import-ynab4" containerProps={{ style: { width: 400 } }}>
      {({ state: { close } }) => (
        <>
          <ModalHeader
            title={t('Import from YNAB4')}
            rightContent={<ModalCloseButton onPress={close} />}
          />
          <View style={{ ...styles.smallText, lineHeight: 1.5, marginTop: 20 }}>
            {error && (
              <Block style={{ color: theme.errorText, marginBottom: 15 }}>
                {getErrorMessage(error)}
              </Block>
            )}

            <View style={{ alignItems: 'center' }}>
              <Paragraph>
                <Trans>
                  To import data from YNAB4, locate where your YNAB4 data is
                  stored. It is usually in your Documents folder under YNAB.
                  Your data is a directory inside that with the
                  <code>.ynab4</code> suffix.
                </Trans>
              </Paragraph>
              <Paragraph>
                <Trans>
                  When you’ve located your data,{' '}
                  <strong>compress it into a zip file</strong>. On macOS,
                  right-click the folder and select “Compress”. On Windows,
                  right-click and select “Send to &rarr; Compressed (zipped)
                  folder”. Upload the zipped folder for importing.
                </Trans>
              </Paragraph>
              <View>
                <ButtonWithLoading
                  variant="primary"
                  autoFocus
                  isLoading={importing}
                  onPress={onImport}
                >
                  <Trans>Select zip file...</Trans>
                </ButtonWithLoading>
              </View>
            </View>
          </View>
        </>
      )}
    </Modal>
  );
}
