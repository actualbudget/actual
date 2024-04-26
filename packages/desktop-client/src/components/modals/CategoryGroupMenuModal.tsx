// @ts-strict-ignore
import React, { type ComponentProps, useState } from 'react';

import { type CategoryGroupEntity } from 'loot-core/src/types/models';

import { useCategories } from '../../hooks/useCategories';
import { useNotes } from '../../hooks/useNotes';
import { SvgDotsHorizontalTriple, SvgAdd, SvgTrash } from '../../icons/v1';
import { SvgNotesPaper, SvgViewHide, SvgViewShow } from '../../icons/v2';
import { type CSSProperties, styles, theme } from '../../style';
import { Button } from '../common/Button';
import { Menu } from '../common/Menu';
import { Modal, ModalTitle } from '../common/Modal';
import { View } from '../common/View';
import { type CommonModalProps } from '../Modals';
import { Notes } from '../Notes';
import { Tooltip } from '../tooltips';

type CategoryGroupMenuModalProps = {
  modalProps: CommonModalProps;
  groupId: string;
  onSave: (group: CategoryGroupEntity) => void;
  onAddCategory: (groupId: string, isIncome: boolean) => void;
  onEditNotes: (id: string) => void;
  onSaveNotes: (id: string, notes: string) => void;
  onDelete: (groupId: string) => void;
  onClose?: () => void;
};

export function CategoryGroupMenuModal({
  modalProps,
  groupId,
  onSave,
  onAddCategory,
  onEditNotes,
  onDelete,
  onClose,
}: CategoryGroupMenuModalProps) {
  const { grouped: categoryGroups } = useCategories();
  const group = categoryGroups.find(g => g.id === groupId);
  const notes = useNotes(group.id);

  const _onClose = () => {
    modalProps?.onClose();
    onClose?.();
  };

  const onRename = newName => {
    if (newName !== group.name) {
      onSave?.({
        ...group,
        name: newName,
      });
    }
  };

  const _onAddCategory = () => {
    onAddCategory?.(group.id, group.is_income);
  };

  const _onEditNotes = () => {
    onEditNotes?.(group.id);
  };

  const _onToggleVisibility = () => {
    onSave?.({
      ...group,
      hidden: !!!group.hidden,
    });
    _onClose();
  };

  const _onDelete = () => {
    onDelete?.(group.id);
  };

  const buttonStyle: CSSProperties = {
    ...styles.mediumText,
    height: styles.mobileMinHeight,
    color: theme.formLabelText,
    // Adjust based on desired number of buttons per row.
    flexBasis: '48%',
    marginLeft: '1%',
    marginRight: '1%',
  };

  return (
    <Modal
      title={
        <ModalTitle isEditable title={group.name} onTitleUpdate={onRename} />
      }
      showHeader
      focusAfterClose={false}
      {...modalProps}
      onClose={_onClose}
      style={{
        height: '45vh',
      }}
      leftHeaderContent={
        <AdditionalCategoryGroupMenu
          group={group}
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
            notes={notes?.length > 0 ? notes : 'No notes'}
            editable={false}
            focused={false}
            getStyle={() => ({
              ...styles.mediumText,
              borderRadius: 6,
              ...((!notes || notes.length === 0) && {
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
          <Button style={buttonStyle} onClick={_onAddCategory}>
            <SvgAdd width={17} height={17} style={{ paddingRight: 5 }} />
            Add category
          </Button>
          <Button style={buttonStyle} onClick={_onEditNotes}>
            <SvgNotesPaper width={20} height={20} style={{ paddingRight: 5 }} />
            Edit notes
          </Button>
        </View>
      </View>
    </Modal>
  );
}

function AdditionalCategoryGroupMenu({ group, onDelete, onToggleVisibility }) {
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
      {!group.is_income && (
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
                style={{
                  ...styles.mediumText,
                  color: theme.formLabelText,
                }}
                getItemStyle={getItemStyle}
                items={
                  [
                    {
                      name: 'toggleVisibility',
                      text: group.hidden ? 'Show' : 'Hide',
                      icon: group.hidden ? SvgViewShow : SvgViewHide,
                      iconSize: 16,
                    },
                    ...(!group.is_income && [
                      Menu.line,
                      {
                        name: 'delete',
                        text: 'Delete',
                        icon: SvgTrash,
                        iconSize: 15,
                      },
                    ]),
                  ].filter(i => i != null) as ComponentProps<
                    typeof Menu
                  >['items']
                }
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
      )}
    </View>
  );
}
