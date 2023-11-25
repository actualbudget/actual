import React, { useState } from 'react';

import { useLiveQuery } from 'loot-core/src/client/query-hooks';
import q from 'loot-core/src/shared/query';
import { type CategoryEntity } from 'loot-core/src/types/models';

import Trash from '../../icons/v1/Trash';
import NotesPaper from '../../icons/v2/NotesPaper';
import ViewHide from '../../icons/v2/ViewHide';
import ViewShow from '../../icons/v2/ViewShow';
import { type CSSProperties, styles } from '../../style';
import { type CommonModalProps } from '../../types/modals';
import Button from '../common/Button';
import Modal from '../common/Modal';
import View from '../common/View';
import Notes from '../Notes';

type CategoryMenuProps = {
  modalProps: CommonModalProps;
  category: CategoryEntity;
  onSave: (category: CategoryEntity) => void;
  onToggleVisibility: (isHidden: boolean) => void;
  onEditNotes: (id: string) => void;
  onDelete: (categoryId: string) => void;
  onBudgetAction: (idx: number, action: string, arg: unknown) => void;
};

export default function CategoryMenu({
  modalProps,
  category,
  onSave,
  onToggleVisibility,
  onEditNotes,
  onDelete,
  onBudgetAction,
}: CategoryMenuProps) {
  const { id, hidden } = category;
  const data = useLiveQuery(() => q('notes').filter({ id }).select('*'), [id]);
  const originalNotes = data && data.length > 0 ? data[0].note : null;

  const [name, setName] = useState(category.name);

  function _onClose() {
    modalProps?.onClose();
  }

  function _onRename(newName) {
    if (newName !== name) {
      onSave?.({
        ...category,
        name: newName,
      });
    }
  }

  function _onToggleVisibility() {
    onToggleVisibility?.(!!hidden);
    _onClose();
  }

  function _onEditNotes() {
    onEditNotes?.(id);
  }

  function _onDelete() {
    onDelete?.(id);
    _onClose();
  }

  function onNameChange(newName) {
    _onRename(newName);
    setName(newName);
  }

  const menuItemStyle: CSSProperties = {
    fontSize: 17,
    fontWeight: 400,
    width: '100%',
  };

  return (
    <Modal
      title={name}
      showHeader={true}
      focusAfterClose={false}
      {...modalProps}
      onClose={_onClose}
      padding={0}
      style={{
        flex: 1,
        height: '85vh',
        padding: '0 10px',
        borderRadius: '6px',
      }}
      editableTitle={true}
      titleStyle={styles.underlinedText}
      onTitleChange={onNameChange}
    >
      {() => (
        <View
          style={{
            flex: 1,
            flexDirection: 'column',
          }}
        >
          <View
            style={{
              overflowY: 'auto',
              width: '100%',
              flex: 1,
            }}
          >
            <Notes
              notes={originalNotes}
              editable={false}
              focused={false}
              getStyle={editable => ({
                borderRadius: 6,
              })}
            />
          </View>
          <View
            style={{
              flexDirection: 'column',
              alignItems: 'center',
              justifyItems: 'center',
              width: '100%',
              paddingTop: 10,
              paddingBottom: 10,
            }}
          >
            <Button
              type="primary"
              style={{
                ...menuItemStyle,
                marginBottom: 10,
              }}
              onPointerUp={_onEditNotes}
            >
              <NotesPaper width={20} height={20} style={{ paddingRight: 5 }} />
              Edit notes
            </Button>
            <Button
              type="primary"
              style={{
                ...menuItemStyle,
                marginBottom: 10,
              }}
              onPointerUp={_onToggleVisibility}
            >
              {category.hidden ? (
                <ViewShow width={20} height={20} style={{ paddingRight: 5 }} />
              ) : (
                <ViewHide width={20} height={20} style={{ paddingRight: 5 }} />
              )}
              {category.hidden ? 'Unhide' : 'Hide'}
            </Button>
            <Button
              type="primary"
              style={menuItemStyle}
              onPointerUp={_onDelete}
            >
              <Trash width={17} height={17} style={{ paddingRight: 5 }} />
              Delete
            </Button>
          </View>
        </View>
      )}
    </Modal>
  );
}
