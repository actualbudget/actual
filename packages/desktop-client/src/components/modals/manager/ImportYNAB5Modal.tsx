// @ts-strict-ignore
import React, { useState } from 'react';
import { useDispatch } from 'react-redux';

import { importBudget } from 'loot-core/src/client/actions/budgets';

import { styles, theme } from '../../../style';
import { Block } from '../../common/Block';
import { ButtonWithLoading } from '../../common/Button2';
import { Link } from '../../common/Link';
import { Modal, ModalCloseButton, ModalHeader } from '../../common/Modal';
import { Paragraph } from '../../common/Paragraph';
import { View } from '../../common/View';

function getErrorMessage(error: string): string {
  switch (error) {
    case 'parse-error':
      return 'Unable to parse file. Please select a JSON file exported from nYNAB.';
    case 'not-ynab5':
      return 'This file is not valid. Please select a JSON file exported from nYNAB.';
    default:
      return 'An unknown error occurred while importing. Please report this as a new issue on Github.';
  }
}

export function ImportYNAB5Modal() {
  const dispatch = useDispatch();
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  async function onImport() {
    const res = await window.Actual?.openFileDialog({
      properties: ['openFile'],
      filters: [{ name: 'ynab', extensions: ['json'] }],
    });
    if (res) {
      setImporting(true);
      setError(null);
      try {
        await dispatch(importBudget(res[0], 'ynab5'));
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
            title="Import from nYNAB"
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
                <Link
                  variant="external"
                  to="https://actualbudget.org/docs/migration/nynab"
                >
                  Read here
                </Link>{' '}
                for instructions on how to migrate your data from YNAB. You need
                to export your data as JSON, and that page explains how to do
                that.
              </Paragraph>
              <Paragraph>
                Once you have exported your data, select the file and Actual
                will import it. Budgets may not match up exactly because things
                work slightly differently, but you should be able to fix up any
                problems.
              </Paragraph>
              <View>
                <ButtonWithLoading
                  variant="primary"
                  autoFocus
                  isLoading={importing}
                  onPress={onImport}
                >
                  Select file...
                </ButtonWithLoading>
              </View>
            </View>
          </View>
        </>
      )}
    </Modal>
  );
}
