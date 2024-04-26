// @ts-strict-ignore
import React, { useState } from 'react';

import { type CategoryEntity } from 'loot-core/src/types/models';

import { useCategory } from '../../hooks/useCategory';
import { useCategoryGroup } from '../../hooks/useCategoryGroup';
import { useNotes } from '../../hooks/useNotes';
import { SvgDotsHorizontalTriple, SvgTrash } from '../../icons/v1';
import { SvgNotesPaper, SvgViewHide, SvgViewShow } from '../../icons/v2';
import { type CSSProperties, styles, theme } from '../../style';
import { Button } from '../common/Button';
import { Menu } from '../common/Menu';
import { Modal, ModalTitle } from '../common/Modal';
import { View } from '../common/View';
import { type CommonModalProps } from '../Modals';
import { Notes } from '../Notes';
import { Tooltip } from '../tooltips';

type CategoryMenuModalProps = {
  modalProps: CommonModalProps;
  categoryId: string;
  onSave: (category: CategoryEntity) => void;
  onEditNotes: (id: string) => void;
  onDelete: (categoryId: string) => void;
  onClose?: () => void;
};

export function CategoryMenuModal({
  modalProps,
  categoryId,
  onSave,
  onEditNotes,
  onDelete,
  onClose,
}: CategoryMenuModalProps) {
  const category = useCategory(categoryId);
  const categoryGroup = useCategoryGroup(category?.cat_group);
  const originalNotes = useNotes(category.id);
  const _onClose = () => {
    modalProps?.onClose();
    onClose?.();
  };

  const onRename = newName => {
    if (newName !== category.name) {
      onSave?.({
        ...category,
        name: newName,
      });
    }
  };

  const _onToggleVisibility = () => {
    onSave?.({
      ...category,
      hidden: !category.hidden,
    });
    _onClose();
  };

  const _onEditNotes = () => {
    onEditNotes?.(category.id);
  };

  const _onDelete = () => {
    onDelete?.(category.id);
  };

  const buttonStyle: CSSProperties = {
    ...styles.mediumText,
    height: styles.mobileMinHeight,
    color: theme.formLabelText,
    // Adjust based on desired number of buttons per row.
    flexBasis: '100%',
  };

  return (
    <Modal
      title={
        <ModalTitle isEditable title={category.name} onTitleUpdate={onRename} />
      }
      showHeader
      focusAfterClose={false}
      {...modalProps}
      onClose={_onClose}
      style={{
        height: '45vh',
      }}
      leftHeaderContent={
        <AdditionalCategoryMenu
          category={category}
          categoryGroup={categoryGroup}
          onDelete={_onDelete}
          onToggleVisibility={_onToggleVisibility}
        />
      }
    >
      <View
        style={{
          flex: 1,
          flexDirection: 'column',
        }}
      >
        <View
          style={{
            overflowY: 'auto',
            flex: 1,
          }}
        >
          <Notes
            notes={originalNotes?.length > 0 ? originalNotes : 'No notes'}
            editable={false}
            focused={false}
            getStyle={() => ({
              borderRadius: 6,
              ...((!originalNotes || originalNotes.length === 0) && {
                justifySelf: 'center',
                alignSelf: 'center',
                color: theme.pageTextSubdued,
              }),
            })}
          />
        </View>
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignContent: 'space-between',
            paddingTop: 10,
          }}
        >
          <Button style={buttonStyle} onClick={_onEditNotes}>
            <SvgNotesPaper width={20} height={20} style={{ paddingRight: 5 }} />
            Edit notes
          </Button>
        </View>
      </View>
    </Modal>
  );
}

function AdditionalCategoryMenu({
  category,
  categoryGroup,
  onDelete,
  onToggleVisibility,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const itemStyle: CSSProperties = {
    ...styles.mediumText,
    height: styles.mobileMinHeight,
  };

  const getItemStyle = item => ({
    ...itemStyle,
    ...(item.name === 'delete' && { color: theme.errorTextMenu }),
  });

  return (
    <View>
      <Button
        type="bare"
        aria-label="Menu"
        onClick={() => {
          setMenuOpen(true);
        }}
      >
        <SvgDotsHorizontalTriple
          width={17}
          height={17}
          style={{ color: 'currentColor' }}
        />
        {menuOpen && (
          <Tooltip
            position="bottom-left"
            style={{ padding: 0 }}
            onClose={() => {
              setMenuOpen(false);
            }}
          >
            <Menu
              getItemStyle={getItemStyle}
              items={[
                !categoryGroup?.hidden && {
                  name: 'toggleVisibility',
                  text: category.hidden ? 'Show' : 'Hide',
                  icon: category.hidden ? SvgViewShow : SvgViewHide,
                  iconSize: 16,
                },
                !categoryGroup?.hidden && Menu.line,
                {
                  name: 'delete',
                  text: 'Delete',
                  icon: SvgTrash,
                  iconSize: 15,
                },
              ]}
              onMenuSelect={itemName => {
                setMenuOpen(false);
                if (itemName === 'delete') {
                  onDelete();
                } else if (itemName === 'toggleVisibility') {
                  onToggleVisibility();
                }
              }}
            />
          </Tooltip>
        )}
      </Button>
    </View>
  );
}
