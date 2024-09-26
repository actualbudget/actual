import React, { useCallback, useState } from 'react';

import { useGlobalPref } from '../../../hooks/useGlobalPref';
import { theme, styles } from '../../../style';
import { Button, ButtonWithLoading } from '../../common/Button2';
import { Modal, ModalCloseButton, ModalHeader } from '../../common/Modal';
import { Text } from '../../common/Text';
import { View } from '../../common/View';
import { Checkbox } from '../../forms';

function DirectoryDisplay({ directory }: { directory: string }) {
  return (
    <View style={{ flexDirection: 'row', gap: '0.5rem', width: '100%' }}>
      <Text
        title={directory}
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
        {directory}
      </Text>
    </View>
  );
}

export function ConfirmChangeDocumentDirModal({
  currentBudgetDirectory,
  newDirectory,
}: {
  currentBudgetDirectory: string;
  newDirectory: string;
}) {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [moveFiles, setMoveFiles] = useState(false);

  const restartElectronServer = useCallback(() => {
    globalThis.window.Actual?.restartElectronServer();
  }, []);

  const [_documentDir, setDocumentDirPref] = useGlobalPref(
    'documentDir',
    restartElectronServer,
  );

  const moveDirectory = async (close: () => void) => {
    setError('');
    setLoading(true);
    try {
      if (moveFiles) {
        await globalThis.window.Actual?.moveBudgetDirectory(
          currentBudgetDirectory,
          newDirectory,
        );
      }

      setDocumentDirPref(newDirectory);
      close();
    } catch (error) {
      console.error('There was an error changing your directory', error);
      setError(
        'There was an error changing your directory, please check the directory and try again.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal name="confirm-change-document-dir">
      {({ state: { close } }) => (
        <>
          <ModalHeader
            title="Are you sure?"
            rightContent={<ModalCloseButton onPress={close} />}
          />
          <View
            style={{
              padding: 15,
              gap: 15,
              paddingTop: 0,
              paddingBottom: 25,
              maxWidth: 500,
              lineHeight: '1.5em',
            }}
          >
            <Text>You are about to move the contents of:</Text>
            <DirectoryDisplay directory={currentBudgetDirectory} />
            <Text>To the following folder:</Text>
            <DirectoryDisplay directory={newDirectory} />
            <label
              htmlFor="moveFiles"
              style={{
                userSelect: 'none',
                flexDirection: 'row',
                gap: '0.5rem',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <Checkbox
                id="moveFiles"
                name="moveFiles"
                checked={moveFiles}
                onChange={() => setMoveFiles(!moveFiles)}
              />
              Move files to new directory
            </label>
            {moveFiles && (
              <Text style={{ color: theme.warningText }}>
                If the destination folder contains files with the same name,
                they will be overridden.
              </Text>
            )}

            {error && <Text style={{ color: theme.errorText }}>{error}</Text>}
          </View>

          <View
            style={{
              gap: '1rem',
              flexDirection: 'row',
              justifyContent: 'center',
            }}
          >
            <Button
              variant="normal"
              style={{
                padding: '10px 30px',
                fontSize: 14,
                alignSelf: 'center',
              }}
              onPress={close}
            >
              Cancel
            </Button>
            <ButtonWithLoading
              variant="primary"
              isLoading={loading}
              style={{
                padding: '10px 30px',
                fontSize: 14,
                alignSelf: 'center',
              }}
              onPress={() => moveDirectory(close)}
            >
              Change Directory
            </ButtonWithLoading>
          </View>
        </>
      )}
    </Modal>
  );
}
