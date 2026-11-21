import { useId, useState } from 'react';
import type { ReactNode } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button, ButtonWithLoading } from '@actual-app/components/button';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { spacing } from '@actual-app/components/tokens';
import { View } from '@actual-app/components/view';
import { css } from '@emotion/css';

import {
  Modal,
  ModalButtons,
  ModalCloseButton,
  ModalHeader,
} from '#components/common/Modal';
import { useFutureBufferMode } from '#hooks/useFutureBufferMode';
import type { FutureBufferMode } from '#hooks/useFutureBufferMode';

export function FutureBufferModeModal() {
  const { t } = useTranslation();
  const { mode, setFutureBufferMode } = useFutureBufferMode();

  // The sheet answers after the first render, so the current mode can't seed
  // the state: until the user picks one, the selection follows the sheet.
  const [choice, setChoice] = useState<FutureBufferMode | null>(null);
  const selectedMode = choice ?? mode;
  const [isSaving, setIsSaving] = useState(false);

  const onSave = async (close: () => void) => {
    if (selectedMode !== mode) {
      setIsSaving(true);
      try {
        await setFutureBufferMode(selectedMode);
      } finally {
        setIsSaving(false);
      }
    }
    close();
  };

  return (
    <Modal name="future-buffer-mode">
      {({ state }) => (
        <>
          <ModalHeader
            title={t('For next month')}
            rightContent={<ModalCloseButton onPress={() => state.close()} />}
          />
          <View style={{ gap: spacing.sm, lineHeight: 1.5, maxWidth: 480 }}>
            <ModeChoice
              isSelected={selectedMode === 'manual'}
              label={t('Manual')}
              onPress={() => setChoice('manual')}
            >
              <Trans>Choose how much to hold using the To Budget menu.</Trans>
            </ModeChoice>
            <ModeChoice
              isSelected={selectedMode === 'automatic'}
              label={t('Automatic')}
              onPress={() => setChoice('automatic')}
            >
              <Trans>Holds what you budget in future months.</Trans>
            </ModeChoice>

            {/* With the column gap, 20px above Save like the confirm dialogs */}
            <ModalButtons style={{ marginTop: spacing.md }}>
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

type ModeChoiceProps = {
  isSelected: boolean;
  label: string;
  onPress: () => void;
  children: ReactNode;
};

function ModeChoice({ isSelected, label, onPress, children }: ModeChoiceProps) {
  const descriptionId = useId();
  return (
    <Button
      aria-pressed={isSelected}
      aria-label={label}
      aria-describedby={descriptionId}
      variant={isSelected ? 'primary' : 'normal'}
      className={choiceStyle}
      onPress={onPress}
    >
      <Text style={{ fontWeight: 600 }}>{label}</Text>
      <Text id={descriptionId}>{children}</Text>
    </Button>
  );
}

const choiceStyle = css({
  alignItems: 'flex-start',
  flexDirection: 'column',
  gap: spacing.xxs,
  justifyContent: 'flex-start',
  padding: spacing.md,
  textAlign: 'left',
});
