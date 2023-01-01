import React, { useState } from 'react';
import { useDispatch } from 'react-redux';

import { importBudget } from 'loot-core/src/client/actions/budgets';

import { styles, colors } from '../../style';
import {
  View,
  Block,
  Modal,
  ButtonWithLoading,
  Button,
  P,
  ExternalLink
} from '../common';

function getErrorMessage(error) {
  switch (error) {
    case 'parse-error':
      return 'Unable to parse file. Please select a JSON file exported from nYNAB.';
    case 'not-ynab5':
      return 'This file is not valid. Please select a JSON file exported from nYNAB.';
    default:
      return 'An unknown error occurred while importing. Sorry! We have been notified of this issue.';
  }
}

function Import({ modalProps, availableImports }) {
  const dispatch = useDispatch();
  const [error, setError] = useState(false);
  const [importing, setImporting] = useState(false);

  async function onImport() {
    const res = await window.Actual.openFileDialog({
      properties: ['openFile'],
      filters: [{ name: 'ynab', extensions: ['json'] }]
    });
    if (res) {
      setImporting(true);
      setError(false);
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
    <Modal
      {...modalProps}
      showHeader={false}
      showOverlay={false}
      noAnimation={true}
      style={{ width: 400 }}
    >
      {() => (
        <View style={[styles.smallText, { lineHeight: 1.5, marginTop: 20 }]}>
          {error && (
            <Block style={{ color: colors.r4, marginBottom: 15 }}>
              {getErrorMessage(error)}
            </Block>
          )}

          <View
            style={{ alignItems: 'center', '& > div': { lineHeight: '1.7em' } }}
          >
            <P>
              <ExternalLink
                asAnchor={true}
                href="https://actualbudget.github.io/docs/Getting-Started/migration/nynab"
                target="_blank"
              >
                Read here
              </ExternalLink>{' '}
              for instructions on how to migrate your data from YNAB. You need
              to export your data as JSON, and that page explains how to do
              that.
            </P>
            <P>
              Once you have exported your data, select the file and Actual will
              import it. Budgets may not match up exactly because things work
              slightly differently, but you should be able to fix up any
              problems.
            </P>
            <View>
              <ButtonWithLoading loading={importing} primary onClick={onImport}>
                Select file...
              </ButtonWithLoading>
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
