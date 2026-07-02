import React, { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button, ButtonWithLoading } from '@actual-app/components/button';
import { Paragraph } from '@actual-app/components/paragraph';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { View } from '@actual-app/components/view';
import type { FutureBufferMode } from '@actual-app/core/types/prefs';
import { css } from '@emotion/css';

import {
  Modal,
  ModalButtons,
  ModalCloseButton,
  ModalHeader,
} from '#components/common/Modal';
import { useFutureBufferMode } from '#hooks/useFutureBufferMode';

export function FutureBufferModeModal() {
  const { t } = useTranslation();
  const { futureBufferMode, setFutureBufferMode } = useFutureBufferMode();
  const [selectedMode, setSelectedMode] =
    useState<FutureBufferMode>(futureBufferMode);
  const [isSaving, setIsSaving] = useState(false);

  const onSave = async (close: () => void) => {
    if (selectedMode === futureBufferMode) {
      close();
      return;
    }

    setIsSaving(true);

    try {
      await setFutureBufferMode(selectedMode);
      close();
    } catch (error) {
      setIsSaving(false);
      throw error;
    }
  };

  return (
    <Modal name="future-buffer-mode">
      {({ state }) => (
        <>
          <ModalHeader
            title={t('Future buffer mode')}
            rightContent={<ModalCloseButton onPress={() => state.close()} />}
          />
          <View style={{ lineHeight: 1.5 }}>
            <Paragraph>
              <Trans>
                Choose how you want to reserve funds for future months.
              </Trans>
            </Paragraph>
            <View style={{ gap: 10 }}>
              <Button
                aria-pressed={selectedMode === 'manual'}
                aria-label={t('Manual mode')}
                className={buttonStyle}
                variant={selectedMode === 'manual' ? 'primary' : 'normal'}
                onPress={() => setSelectedMode('manual')}
              >
                <Text style={{ fontWeight: 600 }}>
                  <Trans>Manual</Trans>
                </Text>
                <Text style={{ maxWidth: '50ch' }}>
                  <Trans>
                    Manage the funds held for future months yourself. Use "Hold
                    for next month" from the "To budget" menu when you want to
                    set money aside.
                  </Trans>
                </Text>
              </Button>
              <Button
                aria-pressed={selectedMode === 'automatic'}
                aria-label={t('Automatic mode')}
                className={buttonStyle}
                variant={selectedMode === 'automatic' ? 'primary' : 'normal'}
                onPress={() => setSelectedMode('automatic')}
              >
                <Text style={{ fontWeight: 600 }}>
                  <Trans>Automatic</Trans>
                </Text>
                <Text style={{ maxWidth: '50ch' }}>
                  <Trans>
                    Let Actual manage the buffer for you. "To budget" and "For
                    next month" will automatically update as you budget into the
                    future.
                  </Trans>
                </Text>
              </Button>
            </View>
            <ModalButtons>
              <ButtonWithLoading
                variant="primary"
                isLoading={isSaving}
                isDisabled={isSaving}
                style={{ height: styles.mobileMinHeight }}
                onPress={() => void onSave(() => state.close())}
              >
                <Trans>Save</Trans>
              </ButtonWithLoading>
            </ModalButtons>
          </View>
        </>
      )}
    </Modal>
  );
}
const buttonStyle = css({
  alignItems: 'flex-start',
  flexDirection: 'column',
  gap: 5,
  justifyContent: 'flex-start',
  padding: 12,
  textAlign: 'left',
});
