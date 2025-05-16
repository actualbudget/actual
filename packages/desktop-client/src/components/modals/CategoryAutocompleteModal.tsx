import React from 'react';
import { useTranslation } from 'react-i18next';

import { useResponsive } from '@actual-app/components/hooks/useResponsive';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import * as monthUtils from 'loot-core/shared/months';

import { CategoryAutocomplete } from '@desktop-client/components/autocomplete/CategoryAutocomplete';
import {
  ModalCloseButton,
  Modal,
  ModalTitle,
  ModalHeader,
} from '@desktop-client/components/common/Modal';
import { SectionLabel } from '@desktop-client/components/forms';
import { SheetNameProvider } from '@desktop-client/hooks/useSheetName';
import { type Modal as ModalType } from '@desktop-client/modals/modalsSlice';

type CategoryAutocompleteModalProps = Extract<
  ModalType,
  { name: 'category-autocomplete' }
>['options'];

export function CategoryAutocompleteModal({
  title,
  month,
  onSelect,
  categoryGroups,
  showHiddenCategories,
  closeOnSelect,
  clearOnSelect,
  onClose,
}: CategoryAutocompleteModalProps) {
  const { t } = useTranslation();
  const { isNarrowWidth } = useResponsive();

  const defaultAutocompleteProps = {
    containerProps: { style: { height: isNarrowWidth ? '90vh' : 275 } },
  };

  return (
    <Modal
      name="category-autocomplete"
      noAnimation={!isNarrowWidth}
      onClose={onClose}
      containerProps={{
        style: {
          height: isNarrowWidth
            ? 'calc(var(--visual-viewport-height) * 0.85)'
            : 275,
          backgroundColor: theme.menuAutoCompleteBackground,
        },
      }}
    >
      {({ state: { close } }) => (
        <>
          {isNarrowWidth && (
            <ModalHeader
              title={
                <ModalTitle
                  title={title || t('Category')}
                  getStyle={() => ({ color: theme.menuAutoCompleteText })}
                />
              }
              rightContent={
                <ModalCloseButton
                  onPress={close}
                  style={{ color: theme.menuAutoCompleteText }}
                />
              }
            />
          )}
          <View>
            {!isNarrowWidth && (
              <SectionLabel
                title={t('Category')}
                style={{
                  alignSelf: 'center',
                  color: theme.menuAutoCompleteText,
                  marginBottom: 10,
                }}
              />
            )}
            <View style={{ flex: 1 }}>
              <SheetNameProvider
                name={month ? monthUtils.sheetForMonth(month) : ''}
              >
                <CategoryAutocomplete
                  focused={true}
                  embedded={true}
                  closeOnBlur={false}
                  closeOnSelect={closeOnSelect}
                  clearOnSelect={clearOnSelect}
                  showSplitOption={false}
                  onClose={close}
                  {...defaultAutocompleteProps}
                  onSelect={onSelect}
                  categoryGroups={categoryGroups}
                  showHiddenCategories={showHiddenCategories}
                  value={null}
                />
              </SheetNameProvider>
            </View>
          </View>
        </>
      )}
    </Modal>
  );
}
