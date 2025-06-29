import React, { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Block } from '@actual-app/components/block';
import { Button } from '@actual-app/components/button';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import {
  Modal,
  ModalCloseButton,
  ModalHeader,
} from '@desktop-client/components/common/Modal';
import { pushModal } from '@desktop-client/modals/modalsSlice';
import { useDispatch } from '@desktop-client/redux';

export function ImportModal() {
  const { t } = useTranslation();

  const dispatch = useDispatch();
  const [error] = useState(false);

  function onSelectType(type: 'ynab4' | 'ynab5' | 'actual') {
    switch (type) {
      case 'ynab4':
        dispatch(pushModal({ modal: { name: 'import-ynab4' } }));
        break;
      case 'ynab5':
        dispatch(pushModal({ modal: { name: 'import-ynab5' } }));
        break;
      case 'actual':
        dispatch(pushModal({ modal: { name: 'import-actual' } }));
        break;
      default:
    }
  }

  function getErrorMessage(error: 'not-ynab4' | boolean) {
    switch (error) {
      case 'not-ynab4':
        return t('This file is not valid. Please select a .ynab4 file');
      default:
        return t(
          'An unknown error occurred while importing. Please report this as a new issue on GitHub.',
        );
    }
  }
  const itemStyle = {
    padding: 10,
    border: '1px solid ' + theme.tableBorder,
    borderRadius: 6,
    marginBottom: 10,
    display: 'block',
  };

  return (
    <Modal name="import" containerProps={{ style: { width: 400 } }}>
      {({ state: { close } }) => (
        <>
          <ModalHeader
            title={t('Import From')}
            rightContent={<ModalCloseButton onPress={close} />}
          />
          <View style={{ ...styles.smallText, lineHeight: 1.5 }}>
            {error && (
              <Block style={{ color: theme.errorText, marginBottom: 15 }}>
                {getErrorMessage(error)}
              </Block>
            )}

            <Text style={{ marginBottom: 15 }}>
              <Trans>
                Select an app to import from, and we’ll guide you through the
                process.
              </Trans>
            </Text>

            <Button style={itemStyle} onPress={() => onSelectType('ynab4')}>
              <span style={{ fontWeight: 700 }}>YNAB4</span>
              <View style={{ color: theme.pageTextLight }}>
                <Trans>The old unsupported desktop app</Trans>
              </View>
            </Button>
            <Button style={itemStyle} onPress={() => onSelectType('ynab5')}>
              <span style={{ fontWeight: 700 }}>nYNAB</span>
              <View style={{ color: theme.pageTextLight }}>
                <div>
                  <Trans>The newer web app</Trans>
                </div>
              </View>
            </Button>
            <Button style={itemStyle} onPress={() => onSelectType('actual')}>
              <span style={{ fontWeight: 700 }}>Actual</span>
              <View style={{ color: theme.pageTextLight }}>
                <div>
                  <Trans>Import a file exported from Actual</Trans>
                </div>
              </View>
            </Button>
          </View>
        </>
      )}
    </Modal>
  );
}
