import { useState } from 'react';
import type { ReactNode } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button, ButtonWithLoading } from '@actual-app/components/button';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { spacing } from '@actual-app/components/tokens';
import { View } from '@actual-app/components/view';
import * as monthUtils from '@actual-app/core/shared/months';
import { css } from '@emotion/css';

import { useEnvelopeSheetValue } from '#components/budget/envelope/EnvelopeBudgetComponents';
import {
  Modal,
  ModalButtons,
  ModalCloseButton,
  ModalHeader,
} from '#components/common/Modal';
import { useFutureBufferMode } from '#hooks/useFutureBufferMode';
import type { FutureBufferMode } from '#hooks/useFutureBufferMode';
import { useLocale } from '#hooks/useLocale';
import { envelopeBudget } from '#spreadsheet/bindings';

// Rendered inside the current month's sheet, so the manual hold read here is
// the one automatic mode would replace.
export function FutureBufferModeModal() {
  const { t } = useTranslation();
  const locale = useLocale();
  const { mode, setFutureBufferMode } = useFutureBufferMode();
  const currentMonthName = monthUtils.format(
    monthUtils.currentMonth(),
    'MMMM yyyy',
    locale,
  );
  const hasManualHold =
    (useEnvelopeSheetValue(envelopeBudget.manualBuffered) ?? 0) !== 0;

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
              <Trans>
                You hold money for next month yourself, from the To Budget menu.
              </Trans>
            </ModeChoice>
            <ModeChoice
              isSelected={selectedMode === 'automatic'}
              label={t('Automatic')}
              onPress={() => setChoice('automatic')}
            >
              {mode === 'automatic' ? (
                <Trans>Held for what your future months need.</Trans>
              ) : (
                <Trans>Starts from {{ currentMonthName }}</Trans>
              )}
            </ModeChoice>

            {selectedMode !== mode && (
              <Text style={{ color: theme.pageTextLight }}>
                {selectedMode === 'automatic' ? (
                  <>
                    <Trans>
                      Money you budget in future months comes out of this
                      month's To Budget.
                    </Trans>
                    {hasManualHold && (
                      <>
                        {' '}
                        <Trans>
                          This replaces the hold you set for{' '}
                          {{ currentMonthName }}.
                        </Trans>
                      </>
                    )}
                  </>
                ) : (
                  <Trans>
                    Each month keeps its current "For next month" amount as a
                    manual hold. Undo can't reverse this.
                  </Trans>
                )}
              </Text>
            )}

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

type ModeChoiceProps = {
  isSelected: boolean;
  label: string;
  onPress: () => void;
  children: ReactNode;
};

function ModeChoice({ isSelected, label, onPress, children }: ModeChoiceProps) {
  return (
    <Button
      aria-pressed={isSelected}
      aria-label={label}
      variant={isSelected ? 'primary' : 'normal'}
      className={choiceStyle}
      onPress={onPress}
    >
      <Text style={{ fontWeight: 600 }}>{label}</Text>
      <Text>{children}</Text>
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
