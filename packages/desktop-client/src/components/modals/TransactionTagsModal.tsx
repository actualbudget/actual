import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { useResponsive } from '@actual-app/components/hooks/useResponsive';
import { Input } from '@actual-app/components/input';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import {
  Modal,
  ModalCloseButton,
  ModalHeader,
  ModalTitle,
} from '#components/common/Modal';
import { SectionLabel } from '#components/forms';
import type { Modal as ModalType } from '#modals/modalsSlice';
import { normalizeNoteTag } from '#notes/tagUtils';

type TransactionTagsModalProps = Extract<
  ModalType,
  { name: 'transaction-tags' }
>['options'];

export function TransactionTagsModal({
  onSubmit,
  onClose,
}: TransactionTagsModalProps) {
  const { t } = useTranslation();
  const { isNarrowWidth } = useResponsive();
  const [tag, setTag] = useState('');
  const normalizedTag = normalizeNoteTag(tag);

  const submit = (action: 'add' | 'remove', close: () => void) => {
    if (!normalizedTag) {
      return;
    }

    onSubmit(action, normalizedTag);
    close();
  };

  return (
    <Modal
      name="transaction-tags"
      noAnimation={!isNarrowWidth}
      onClose={onClose}
      containerProps={{
        style: {
          height: isNarrowWidth
            ? 'calc(var(--visual-viewport-height) * 0.85)'
            : 'auto',
          padding: '15px 10px',
          backgroundColor: theme.menuAutoCompleteBackground,
        },
      }}
    >
      {({ state }) => (
        <>
          {isNarrowWidth && (
            <ModalHeader
              title={
                <ModalTitle
                  title={t('Tags')}
                  getStyle={() => ({ color: theme.menuAutoCompleteText })}
                />
              }
              rightContent={<ModalCloseButton onPress={() => state.close()} />}
            />
          )}
          <View style={{ gap: 12 }}>
            {!isNarrowWidth && (
              <SectionLabel
                title={t('Tags')}
                style={{
                  alignSelf: 'center',
                  color: theme.menuAutoCompleteText,
                  marginBottom: 4,
                }}
              />
            )}
            <Input
              autoFocus
              placeholder={t('Tag')}
              value={tag}
              onChange={({ currentTarget: { value } }) => setTag(value)}
              onEnter={() => submit('add', () => state.close())}
            />
            <Text style={{ color: theme.menuAutoCompleteText }}>
              {normalizedTag ? `#${normalizedTag}` : t('Enter a tag')}
            </Text>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'flex-end',
                gap: 10,
              }}
            >
              <Button
                isDisabled={!normalizedTag}
                onPress={() => submit('remove', () => state.close())}
              >
                <Trans>Remove tag</Trans>
              </Button>
              <Button
                variant="primary"
                isDisabled={!normalizedTag}
                onPress={() => submit('add', () => state.close())}
              >
                <Trans>Add tag</Trans>
              </Button>
            </View>
          </View>
        </>
      )}
    </Modal>
  );
}
