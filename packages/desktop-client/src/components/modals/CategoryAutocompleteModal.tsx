import React from 'react';

import { useResponsive } from '../../ResponsiveProvider';
import { styles, theme } from '../../style';
import {
  CategoryAutocomplete,
  type CategoryAutocompleteProps,
  CategoryItem,
} from '../autocomplete/CategoryAutocomplete';
import { ItemHeader } from '../autocomplete/ItemHeader';
import { Modal } from '../common/Modal';
import { View } from '../common/View';
import { SectionLabel } from '../forms';
import { type CommonModalProps } from '../Modals';

type CategoryAutocompleteModalProps = Partial<CategoryAutocompleteProps> & {
  modalProps: CommonModalProps;
  onClose: () => void;
};

export function CategoryAutocompleteModal({
  modalProps,
  categoryGroups,
  onSelect,
  onClose,
  ...props
}: CategoryAutocompleteModalProps) {
  const _onClose = () => {
    modalProps.onClose();
    onClose?.();
  };

  function _onSelect(id: string, value: string) {
    onSelect?.(id, value);
    _onClose();
  }

  const itemStyle = {
    fontSize: 17,
    fontWeight: 400,
    paddingTop: 8,
    paddingBottom: 8,
  };

  const { isNarrowWidth } = useResponsive();
  const inputStyle = {
    ':focus': { boxShadow: 0 },
    ...(isNarrowWidth && itemStyle),
  };
  const autocompleteProps = {
    inputProps: { style: inputStyle },
    containerProps: { style: { height: isNarrowWidth ? '90vh' : 275 } },
  };

  return (
    <Modal
      title="Category"
      noAnimation={!isNarrowWidth}
      showHeader={isNarrowWidth}
      focusAfterClose={false}
      {...modalProps}
      onClose={_onClose}
      padding={0}
      style={{
        flex: 0,
        height: isNarrowWidth ? '85vh' : 275,
        padding: '15px 10px',
        borderRadius: '6px',
        ...(!isNarrowWidth && {
          backgroundColor: theme.mobileModalBackground,
          color: theme.mobileModalText,
        }),
      }}
    >
      {() => (
        <View>
          {!isNarrowWidth && (
            <SectionLabel
              title="Category"
              style={{
                alignSelf: 'center',
                color: theme.mobileModalText,
                marginBottom: 10,
              }}
            />
          )}
          <View style={{ flex: 1 }}>
            <CategoryAutocomplete
              categoryGroups={categoryGroups}
              value={null}
              focused={true}
              embedded={true}
              closeOnBlur={false}
              showSplitOption={false}
              onUpdate={() => {}}
              onSelect={_onSelect}
              {...(isNarrowWidth && {
                renderCategoryItemGroupHeader: props => (
                  <ItemHeader
                    {...props}
                    style={{
                      ...styles.largeText,
                      color: theme.menuItemTextHeader,
                      paddingTop: 10,
                      paddingBottom: 10,
                    }}
                  />
                ),
                renderCategoryItem: props => (
                  <CategoryItem
                    {...props}
                    style={{
                      ...itemStyle,
                      color: theme.menuItemText,
                      borderRadius: 0,
                      borderTop: `1px solid ${theme.pillBorder}`,
                    }}
                  />
                ),
              })}
              {...autocompleteProps}
              showHiddenCategories={false}
              {...props}
            />
          </View>
        </View>
      )}
    </Modal>
  );
}
