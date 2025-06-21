// @ts-strict-ignore
import React, { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Block } from '@actual-app/components/block';
import { ButtonWithLoading } from '@actual-app/components/button';
import { Paragraph } from '@actual-app/components/paragraph';
import { styles } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { importBudget } from '@desktop-client/budgets/budgetsSlice';
import { Link } from '@desktop-client/components/common/Link';
import {
  Modal,
  ModalCloseButton,
  ModalHeader,
} from '@desktop-client/components/common/Modal';
import { useNavigate } from '@desktop-client/hooks/useNavigate';
import { useDispatch } from '@desktop-client/redux';

export function ImportYNAB5Modal() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [error, setError] = useState<string | null>(null);

  function getErrorMessage(error: string): string {
    switch (error) {
      case 'parse-error':
        return t(
          'Unable to parse file. Please select a JSON file exported from nYNAB.',
        );
      case 'not-ynab5':
        return t(
          'This file is not valid. Please select a JSON file exported from nYNAB.',
        );
      default:
        return t(
          'An unknown error occurred while importing. Please report this as a new issue on GitHub.',
        );
    }
  }

  const [importing, setImporting] = useState(false);

  async function onImport() {
    const res = await window.Actual.openFileDialog({
      properties: ['openFile'],
      filters: [{ name: 'ynab', extensions: ['json'] }],
    });
    if (res) {
      setImporting(true);
      setError(null);
      try {
        await dispatch(importBudget({ filepath: res[0], type: 'ynab5' }));
        navigate('/budget');
      } catch (err) {
        setError(err.message);
      } finally {
        setImporting(false);
      }
    }
  }

  return (
    <Modal name="import-ynab5" containerProps={{ style: { width: 400 } }}>
      {({ state: { close } }) => (
        <>
          <ModalHeader
            title={t('Import from nYNAB')}
            rightContent={<ModalCloseButton onPress={close} />}
          />
          <View style={{ ...styles.smallText, lineHeight: 1.5, marginTop: 20 }}>
            {error && (
              <Block style={{ color: theme.errorText, marginBottom: 15 }}>
                {getErrorMessage(error)}
              </Block>
            )}

            <View
              style={{
                alignItems: 'center',
                '& > div': { lineHeight: '1.7em' },
              }}
            >
              <Paragraph>
                <Trans>
                  <Link
                    variant="external"
                    to="https://actualbudget.org/docs/migration/nynab"
                  >
                    Read here
                  </Link>{' '}
                  for instructions on how to migrate your data from YNAB. You
                  need to export your data as JSON, and that page explains how
                  to do that.
                </Trans>
              </Paragraph>
              <Paragraph>
                <Trans>
                  Once you have exported your data, select the file and Actual
                  will import it. Budgets may not match up exactly because
                  things work slightly differently, but you should be able to
                  fix up any problems.
                </Trans>
              </Paragraph>
              <View>
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
