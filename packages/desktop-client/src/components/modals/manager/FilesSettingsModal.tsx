import React, { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { SvgPencil1 } from '@actual-app/components/icons/v2';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { loadAllFiles } from '@desktop-client/budgets/budgetsSlice';
import {
  Modal,
  ModalCloseButton,
  ModalHeader,
} from '@desktop-client/components/common/Modal';
import { useGlobalPref } from '@desktop-client/hooks/useGlobalPref';
import { pushModal } from '@desktop-client/modals/modalsSlice';
import { useDispatch } from '@desktop-client/redux';

function FileLocationSettings() {
  const [documentDir, _setDocumentDirPref] = useGlobalPref('documentDir');
  const [_documentDirChanged, setDirChanged] = useState(false);
  const { t } = useTranslation();
  const dispatch = useDispatch();

  async function onChooseDocumentDir() {
    const chosenDirectory = await window.Actual.openFileDialog({
      properties: ['openDirectory'],
    });

    if (chosenDirectory && documentDir && chosenDirectory[0] !== documentDir) {
      setDirChanged(true);

      dispatch(
        pushModal({
          modal: {
            name: 'confirm-change-document-dir',
            options: {
              currentBudgetDirectory: documentDir,
              newDirectory: chosenDirectory[0],
            },
          },
        }),
      );
    }
  }

  return (
    <View
      style={{
        gap: 15,
        backgroundColor: theme.pillBackground,
        alignSelf: 'flex-start',
        alignItems: 'flex-start',
        padding: 15,
        borderRadius: 4,
        border: '1px solid ' + theme.pillBorderDark,
        width: '100%',
      }}
    >
      <Text>
        <Trans>
          <strong>Actual’s data directory</strong>{' '}
          <small style={{ marginLeft: '0.5rem' }}>
            <i>where your files are stored</i>
          </small>
        </Trans>
      </Text>
      <View style={{ flexDirection: 'row', gap: '0.5rem', width: '100%' }}>
        <Text
          title={documentDir}
          style={{
            backgroundColor: theme.pageBackground,
            padding: '5px 10px',
            borderRadius: 4,
            overflow: 'auto',
            whiteSpace: 'nowrap',
            width: '100%',
            ...styles.horizontalScrollbar,
            '::-webkit-scrollbar': {
              height: '8px',
            },
          }}
        >
          {documentDir}
        </Text>
        <Button onPress={onChooseDocumentDir} aria-label={t('Change location')}>
          <SvgPencil1
            style={{
              width: 11,
              height: 11,
            }}
          />
        </Button>
      </View>
    </View>
  );
}

function SelfSignedCertLocationSettings() {
  const [serverSelfSignedCertPref, _setServerSelfSignedCertPref] =
    useGlobalPref('serverSelfSignedCert');

  if (!serverSelfSignedCertPref) {
    return null;
  }

  return (
    <View
      style={{
        gap: 15,
        backgroundColor: theme.pillBackground,
        alignSelf: 'flex-start',
        alignItems: 'flex-start',
        padding: 15,
        borderRadius: 4,
        border: '1px solid ' + theme.pillBorderDark,
        width: '100%',
      }}
    >
      <Text>
        <Trans>
          <strong>Server self-signed certificate</strong>{' '}
          <small style={{ marginLeft: '0.5rem' }}>
            <i>enables a secure connection</i>
          </small>
        </Trans>
      </Text>
      <View style={{ flexDirection: 'row', gap: '0.5rem', width: '100%' }}>
        <Text
          title={serverSelfSignedCertPref}
          style={{
            backgroundColor: theme.pageBackground,
            padding: '5px 10px',
            borderRadius: 4,
            overflow: 'auto',
            whiteSpace: 'nowrap',
            width: '100%',
            ...styles.horizontalScrollbar,
            '::-webkit-scrollbar': {
              height: '8px',
            },
          }}
        >
          {serverSelfSignedCertPref}
        </Text>
      </View>
    </View>
  );
}

export function FilesSettingsModal() {
  const { t } = useTranslation();

  const dispatch = useDispatch();

  function closeModal(close: () => void) {
    dispatch(loadAllFiles());
    close();
  }

  return (
    <Modal name="files-settings">
      {({ state: { close } }) => (
        <>
          <ModalHeader
            title={t('Settings')}
            rightContent={
              <ModalCloseButton onPress={() => closeModal(close)} />
            }
          />
          <View
            style={{
              padding: 15,
              gap: 15,
              paddingTop: 0,
              paddingBottom: 25,
              maxWidth: 550,
              lineHeight: '1.5em',
            }}
          >
            <FileLocationSettings />
            <SelfSignedCertLocationSettings />
            <Button
              variant="primary"
              style={{
                padding: '10px 30px',
                fontSize: 14,
                alignSelf: 'center',
              }}
              onPress={() => closeModal(close)}
            >
              <Trans>OK</Trans>
            </Button>
          </View>
        </>
      )}
    </Modal>
  );
}
