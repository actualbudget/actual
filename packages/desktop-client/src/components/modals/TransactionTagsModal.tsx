import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { useResponsive } from '@actual-app/components/hooks/useResponsive';
import { SvgClose } from '@actual-app/components/icons/v1';
import { Input } from '@actual-app/components/input';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import type { TagEntity } from '@actual-app/core/types/models';

import {
  Modal,
  ModalCloseButton,
  ModalHeader,
  ModalTitle,
} from '#components/common/Modal';
import { SectionLabel } from '#components/forms';
import { useTagCSS } from '#hooks/useTagCSS';
import { useTags } from '#hooks/useTags';
import { pushModal } from '#modals/modalsSlice';
import type { Modal as ModalType } from '#modals/modalsSlice';
import {
  filterExistingNoteTags,
  normalizeNoteTag,
  toggleSelectedNoteTag,
} from '#notes/tagUtils';
import { useDispatch } from '#redux';

type TransactionTagsModalProps = Extract<
  ModalType,
  { name: 'transaction-tags' }
>['options'];

export function TransactionTagsModal({
  onSubmit,
  onClose,
}: TransactionTagsModalProps) {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { isNarrowWidth } = useResponsive();
  const getTagCSS = useTagCSS();
  const { data: existingTags = [] } = useTags();
  const [tag, setTag] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const existingTagNames = existingTags.map(({ tag }) => tag);
  const tagMap = new Map(
    existingTags.map(tagEntity => [tagEntity.tag, tagEntity]),
  );
  const normalizedTag = normalizeNoteTag(tag);
  const filteredTags = filterExistingNoteTags(existingTagNames, tag).filter(
    currentTag => !selectedTags.includes(currentTag),
  );
  const canCreateTag =
    normalizedTag &&
    !existingTagNames.includes(normalizedTag) &&
    !selectedTags.includes(normalizedTag);
  const hasExistingTags = existingTags.length > 0;

  const submit = (action: 'add' | 'remove', close: () => void) => {
    if (selectedTags.length === 0) {
      return;
    }

    onSubmit(action, selectedTags);
    close();
  };

  const selectTag = (tagToSelect: string) => {
    setSelectedTags(tags => toggleSelectedNoteTag(tags, tagToSelect));
    setTag('');
  };

  const selectTypedTag = () => {
    if (!normalizedTag) {
      return;
    }

    selectTag(normalizedTag);
  };

  const confirmRemoveAllTags = (close: () => void) => {
    dispatch(
      pushModal({
        modal: {
          name: 'confirm-delete',
          options: {
            message: t(
              'This will remove every tag from the selected transactions.',
            ),
            onConfirm: () => {
              onSubmit('remove-all');
              close();
            },
          },
        },
      }),
    );
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
              onEnter={selectTypedTag}
            />
            {selectedTags.length > 0 && (
              <View
                style={{
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  gap: 6,
                }}
              >
                {selectedTags.map(selectedTag => (
                  <TagChip
                    key={selectedTag}
                    tag={selectedTag}
                    tagEntity={tagMap.get(selectedTag)}
                    getTagCSS={getTagCSS}
                    onPress={() => selectTag(selectedTag)}
                  />
                ))}
              </View>
            )}
            {hasExistingTags ? (
              <View
                style={{
                  maxHeight: 160,
                  overflowY: 'auto',
                  border: `1px solid ${theme.formInputBorder}`,
                  borderRadius: 4,
                  backgroundColor: theme.tableBackground,
                }}
              >
                {filteredTags.map(existingTag => (
                  <TagOption
                    key={existingTag}
                    tag={existingTag}
                    tagEntity={tagMap.get(existingTag)}
                    getTagCSS={getTagCSS}
                    onPress={() => selectTag(existingTag)}
                  />
                ))}
                {canCreateTag && (
                  <TagOption
                    tag={normalizedTag}
                    getTagCSS={getTagCSS}
                    onPress={selectTypedTag}
                    prefix={t('Add')}
                  />
                )}
              </View>
            ) : (
              <Text style={{ color: theme.menuAutoCompleteText }}>
                <Trans>Enter a tag</Trans>
              </Text>
            )}
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                gap: 10,
              }}
            >
              <Button onPress={() => confirmRemoveAllTags(() => state.close())}>
                <Trans>Remove all tags</Trans>
              </Button>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Button
                  isDisabled={selectedTags.length === 0}
                  onPress={() => submit('remove', () => state.close())}
                >
                  <Trans>Remove tags</Trans>
                </Button>
                <Button
                  variant="primary"
                  isDisabled={selectedTags.length === 0}
                  onPress={() => submit('add', () => state.close())}
                >
                  <Trans>Add tags</Trans>
                </Button>
              </View>
            </View>
          </View>
        </>
      )}
    </Modal>
  );
}

type TagChipProps = {
  tag: string;
  tagEntity?: TagEntity;
  getTagCSS: ReturnType<typeof useTagCSS>;
  onPress: () => void;
};

function TagChip({ tag, tagEntity, getTagCSS, onPress }: TagChipProps) {
  const { t } = useTranslation();

  return (
    <Button
      variant="bare"
      className={getTagCSS(tag, { color: tagEntity?.color, compact: true })}
      aria-label={t('Remove {{tag}} tag', { tag })}
      onPress={onPress}
    >
      #{tag}
      <SvgClose width={8} height={8} style={{ marginLeft: 4 }} />
    </Button>
  );
}

type TagOptionProps = {
  tag: string;
  tagEntity?: TagEntity;
  getTagCSS: ReturnType<typeof useTagCSS>;
  onPress: () => void;
  prefix?: string;
};

function TagOption({
  tag,
  tagEntity,
  getTagCSS,
  onPress,
  prefix,
}: TagOptionProps) {
  return (
    <Button
      variant="bare"
      onPress={onPress}
      style={{
        justifyContent: 'flex-start',
        padding: '6px 8px',
        width: '100%',
      }}
    >
      {prefix && (
        <Text style={{ color: theme.menuAutoCompleteText, marginRight: 6 }}>
          {prefix}
        </Text>
      )}
      <Text
        className={getTagCSS(tag, { color: tagEntity?.color, compact: true })}
      >
        #{tag}
      </Text>
    </Button>
  );
}
