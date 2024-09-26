import React, { useState } from 'react';
import { useDispatch } from 'react-redux';

import { loadAllFiles, pushModal } from 'loot-core/client/actions';

import { useGlobalPref } from '../../../hooks/useGlobalPref';
import { theme, styles } from '../../../style';
import { Button } from '../../common/Button2';
import { Modal, ModalCloseButton, ModalHeader } from '../../common/Modal';
import { Text } from '../../common/Text';
import { View } from '../../common/View';

function FileLocationSettings() {
  const [documentDir, _setDocumentDirPref] = useGlobalPref('documentDir');
  const [_documentDirChanged, setDirChanged] = useState(false);
  const dispatch = useDispatch();

  async function onChooseDocumentDir() {
    const chosenDirectory = await window.Actual?.openFileDialog({
      properties: ['openDirectory'],
    });

    if (chosenDirectory && chosenDirectory[0] !== documentDir) {
      setDirChanged(true);
      const currentBudgetDirectory: string = documentDir;
      const newDirectory: string = chosenDirectory[0];

      dispatch(
        pushModal('confirm-change-document-dir', {
          currentBudgetDirectory,
          newDirectory,
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
        <strong>Actual’s data directory</strong>{' '}
        <small style={{ marginLeft: '0.5rem' }}>
          <i>where your files are stored</i>
        </small>
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
        <Button onPress={onChooseDocumentDir}>Change location</Button>
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
        <strong>Server self-signed certificate</strong>{' '}
        <small style={{ marginLeft: '0.5rem' }}>
          <i>enables a secure connection</i>
        </small>
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
            title="Settings"
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
              OK
            </Button>
          </View>
        </>
      )}
    </Modal>
  );
}
