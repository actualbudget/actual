import { useEffect, useRef, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { Modal, ModalCloseButton, ModalHeader } from '#components/common/Modal';
import type { Modal as ModalType } from '#modals/modalsSlice';
import { addNotification } from '#notifications/notificationsSlice';
import { useDispatch } from '#redux';

type ShowApiTokenModalProps = Extract<
  ModalType,
  { name: 'show-api-token' }
>['options'];

export function ShowApiTokenModal({ token }: ShowApiTokenModalProps) {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const [copied, setCopied] = useState(false);
  const copiedTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copiedTimeout.current) {
        clearTimeout(copiedTimeout.current);
      }
    };
  }, []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(token.token);
      setCopied(true);
      if (copiedTimeout.current) {
        clearTimeout(copiedTimeout.current);
      }
      copiedTimeout.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      dispatch(
        addNotification({
          notification: {
            type: 'error',
            message: t('Failed to copy to clipboard'),
          },
        }),
      );
    }
  };

  return (
    <Modal name="show-api-token">
      {({ state }) => (
        <>
          <ModalHeader
            title={t('Token Created')}
            rightContent={<ModalCloseButton onPress={() => state.close()} />}
          />
          <View>
            <Text style={{ marginBottom: 10, color: theme.warningText }}>
              <Trans>
                Copy this token now. You won&#39;t be able to see it again!
              </Trans>
            </Text>

            <View
              style={{
                backgroundColor: theme.tableBackground,
                padding: 10,
                borderRadius: 4,
                marginBottom: 15,
                fontFamily: 'monospace',
                wordBreak: 'break-all',
                border: `1px solid ${theme.tableBorder}`,
              }}
            >
              {token.token}
            </View>

            <View
              style={{
                flexDirection: 'row',
                gap: 10,
                justifyContent: 'flex-end',
              }}
            >
              <Button variant="normal" onPress={handleCopy}>
                {copied ? (
                  <Trans>Copied!</Trans>
                ) : (
                  <Trans>Copy to Clipboard</Trans>
                )}
              </Button>
              <Button variant="primary" onPress={() => state.close()}>
                <Trans>Done</Trans>
              </Button>
            </View>
          </View>
        </>
      )}
    </Modal>
  );
}
