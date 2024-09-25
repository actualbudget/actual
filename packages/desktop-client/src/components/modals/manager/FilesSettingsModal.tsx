import React, { useEffect, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';

import { loadAllFiles, pushModal } from 'loot-core/client/actions';

import { useGlobalPref } from '../../../hooks/useGlobalPref';
import { theme } from '../../../style';
import { Button } from '../../common/Button2';
import { Modal, ModalCloseButton, ModalHeader } from '../../common/Modal';
import { Text } from '../../common/Text';
import { View } from '../../common/View';

function FileLocationSettings() {
  const [documentDir, _setDocumentDirPref] = useGlobalPref('documentDir');

  const [_documentDirChanged, setDirChanged] = useState(false);
  const dirScrolled = useRef<HTMLSpanElement>(null);

  const dispatch = useDispatch();
  useEffect(() => {
    if (dirScrolled.current) {
      dirScrolled.current.scrollTo(10000, 0);
    }
  }, []);

  async function onChooseDocumentDir() {
    const chosenDirectory = await window.Actual?.openFileDialog({
      properties: ['openDirectory'],
    });

    if (chosenDirectory && chosenDirectory[0] !== documentDir) {
      setDirChanged(true);
      dispatch(
        pushModal('confirm-change-document-dir', {
          currentBudgetDirectory: documentDir,
          newDirectory: chosenDirectory[0],
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
          innerRef={dirScrolled}
          title={documentDir}
          style={{
            backgroundColor: theme.pageBackground,
            padding: '7px 10px',
            borderRadius: 4,
            overflow: 'auto',
            whiteSpace: 'nowrap',
            width: '100%',
            '::-webkit-scrollbar': { display: 'none' }, // Removes the scrollbar
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

  const dirScrolled = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (dirScrolled.current) {
      dirScrolled.current.scrollTo(10000, 0);
    }
  }, []);

  if (!serverSelfSignedCertPref) {
    return;
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
          innerRef={dirScrolled}
          title={serverSelfSignedCertPref}
          style={{
            backgroundColor: theme.pageBackground,
            padding: '7px 10px',
            borderRadius: 4,
            overflow: 'auto',
            whiteSpace: 'nowrap',
            width: '100%',
            '::-webkit-scrollbar': { display: 'none' }, // Removes the scrollbar
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
