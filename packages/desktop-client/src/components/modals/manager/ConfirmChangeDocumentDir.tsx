import React, { useCallback, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useDispatch } from 'react-redux';

import { addNotification } from 'loot-core/client/actions';

import { useGlobalPref } from '../../../hooks/useGlobalPref';
import { theme, styles } from '../../../style';
import { Information } from '../../alerts';
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
  const { t } = useTranslation();
  const dispatch = useDispatch();

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

      dispatch(
        addNotification({
          type: 'message',
          message: t('Actual’s data directory successfully changed.'),
        }),
      );
      close();
    } catch (error) {
      console.error('There was an error changing your directory', error);
      setError(
        t(
          'There was an error changing your directory, please check the directory and try again.',
        ),
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
            title={t('Are you sure?')}
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
                  You are about to change Actual’s data directory from:
                </Trans>
              </Text>
              <DirectoryDisplay directory={currentBudgetDirectory} />
              <Text>
                <Trans>To:</Trans>
              </Text>
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
                <Trans>Move files to new directory</Trans>
              </label>
              {moveFiles && (
                <Information style={{ color: theme.warningText, padding: 0 }}>
                  <Trans>
                    Files in the destination folder with the same name will be
                    overwritten.
                  </Trans>
                </Information>
              )}

              {!moveFiles && (
                <Information style={{ padding: 0 }}>
                  <Trans>
                    Your files won’t be moved. You can manually move them to the
                    folder.
                  </Trans>
                </Information>
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
                <Trans>Cancel</Trans>
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
                <Trans>Change Directory</Trans>
              </ButtonWithLoading>
            </View>
          </View>
        </>
      )}
    </Modal>
  );
}
