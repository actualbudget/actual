import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Block } from '@actual-app/components/block';
import { Button } from '@actual-app/components/button';
import { useResponsive } from '@actual-app/components/hooks/useResponsive';
import { Paragraph } from '@actual-app/components/paragraph';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { spacing } from '@actual-app/components/tokens';
import { View } from '@actual-app/components/view';

import { CategoryAutocomplete } from '#components/autocomplete/CategoryAutocomplete';
import { CategoryDeleteMessage } from '#components/budget/CategoryDeleteMessage';
import { Modal, ModalCloseButton, ModalHeader } from '#components/common/Modal';
import { MobileSheet } from '#components/mobile/MobileSheet';
import { MobileSheetActions } from '#components/mobile/MobileSheetActions';
import { MobileSheetCategoryPicker } from '#components/mobile/MobileSheetCategoryPicker';
import { useCategories } from '#hooks/useCategories';
import type { Modal as ModalType } from '#modals/modalsSlice';

type ConfirmCategoryDeleteModalProps = Extract<
  ModalType,
  { name: 'confirm-category-delete' }
>['options'];

export function ConfirmCategoryDeleteModal({
  group: groupId,
  category: categoryId,
  onDelete,
}: ConfirmCategoryDeleteModalProps) {
  const { t } = useTranslation();
  const { isNarrowWidth } = useResponsive();
  const [transferCategory, setTransferCategory] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);
  const {
    data: { grouped: categoryGroups, list: categories } = {
      grouped: [],
      list: [],
    },
  } = useCategories();
  const group = categoryGroups.find(g => g.id === groupId);
  const category = categories.find(c => c.id === categoryId);
  const subject = category ?? group;

  if (!subject) {
    return null;
  }

  const isIncome = Boolean(subject.is_income);
  const transferCategoryName =
    categories.find(c => c.id === transferCategory)?.name ?? '';
  const transferGroups = group
    ? categoryGroups.filter(
        g => g.id !== group.id && Boolean(g.is_income) === isIncome,
      )
    : categoryGroups
        .filter(g => Boolean(g.is_income) === isIncome)
        .map(g => ({
          ...g,
          categories: (g.categories ?? []).filter(c => c.id !== categoryId),
        }));

  const onSelectTransfer = (id: string | null) => {
    setTransferCategory(id);
    if (id) {
      setHasError(false);
    }
  };

  const confirmDelete = (close: () => void) => {
    if (!transferCategory) {
      setHasError(true);
      return;
    }
    onDelete(transferCategory);
    close();
  };

  const message = <CategoryDeleteMessage category={category} group={group} />;

  const errorMessage = hasError && (
    <Text style={{ marginTop: spacing.md, color: theme.errorText }}>
      <Trans>You must select a category</Trans>
    </Text>
  );

  if (isNarrowWidth) {
    return (
      <MobileSheet name="confirm-category-delete" title={t('Confirm Delete')}>
        {({ close }) => (
          <View style={{ padding: `0 ${spacing.lg}px` }}>
            <Paragraph>{message}</Paragraph>
            <Text style={{ marginBottom: spacing.sm }}>
              <Trans>Transfer to:</Trans>
            </Text>
            <MobileSheetCategoryPicker
              categoryGroups={transferGroups}
              valueName={transferCategoryName}
              onSelect={onSelectTransfer}
            />
            {errorMessage}
            <MobileSheetActions
              onCancel={close}
              confirmLabel={t('Delete')}
              isDestructive
              onConfirm={() => confirmDelete(close)}
            />
          </View>
        )}
      </MobileSheet>
    );
  }

  return (
    <Modal
      name="confirm-category-delete"
      containerProps={{ style: { width: '30vw' } }}
    >
      {({ state }) => (
        <>
          <ModalHeader
            title={t('Confirm Delete')}
            rightContent={<ModalCloseButton onPress={() => state.close()} />}
          />
          <View style={{ lineHeight: 1.5 }}>
            <Block>{message}</Block>
            {errorMessage}
            <View
              style={{
                marginTop: spacing.xl,
                flexDirection: 'row',
                justifyContent: 'flex-start',
                alignItems: 'center',
              }}
            >
              <Text>
                <Trans>Transfer to:</Trans>
              </Text>
              <View
                style={{
                  flex: 1,
                  marginLeft: spacing.md,
                  marginRight: spacing.xl,
                }}
              >
                <CategoryAutocomplete
                  categoryGroups={transferGroups}
                  value={transferCategory}
                  focused
                  inputProps={{ placeholder: t('Select category...') }}
                  onSelect={onSelectTransfer}
                  showHiddenCategories
                />
              </View>
              <Button
                variant="primary"
                onPress={() => confirmDelete(() => state.close())}
              >
                <Trans>Delete</Trans>
              </Button>
            </View>
          </View>
        </>
      )}
    </Modal>
  );
}
