import React, { useCallback, useEffect, useRef, useState } from 'react';

import { useGlobalPref } from '../../../hooks/useGlobalPref';
import { theme } from '../../../style';
import { Information } from '../../alerts';
import { Button } from '../../common/Button2';
import { Modal, ModalCloseButton, ModalHeader } from '../../common/Modal';
import { Text } from '../../common/Text';
import { View } from '../../common/View';

function FileLocationSettings() {
  const [documentDir, setDocumentDirPref] = useGlobalPref('documentDir');

  const [documentDirChanged, setDirChanged] = useState(false);
  const dirScrolled = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (dirScrolled.current) {
      dirScrolled.current.scrollTo(10000, 0);
    }
  }, []);

  async function onChooseDocumentDir() {
    const chosenDirectory = await window.Actual?.openFileDialog({
      properties: ['openDirectory'],
    });

    if (chosenDirectory) {
      setDocumentDirPref(chosenDirectory[0]);
      setDirChanged(true);
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

      {documentDirChanged && (
        <Information>
          <strong>Remember</strong> to copy your budget(s) into the new folder.{' '}
          <br />A restart is required for this change to take effect.
        </Information>
      )}
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

function BackupSettings() {
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
        <strong>Backups</strong>
        <small style={{ marginLeft: '0.5rem' }}>
          <i>automated backups</i>
        </small>
        <p>
          Backups are created every 15 minutes and stored in{' '}
          <strong>
            <i>Actual’s data directory</i>
          </strong>
          . The system retains a maximum of 10 backups at any time.
        </p>
      </Text>
    </View>
  );
}

export function FilesSettingsModal() {
  return (
    <Modal name="files-settings">
      {({ state: { close } }) => (
        <>
          <ModalHeader
            title="Settings"
            rightContent={<ModalCloseButton onPress={close} />}
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
            <BackupSettings />
            <Button
              variant="primary"
              style={{
                padding: '10px 30px',
                fontSize: 14,
              }}
              onPress={close}
            >
              OK
            </Button>
          </View>
        </>
      )}
    </Modal>
  );
}
