import React, { useState } from 'react';

import { useLiveQuery } from 'loot-core/src/client/query-hooks';
import q from 'loot-core/src/shared/query';
import { type CategoryEntity } from 'loot-core/src/types/models';

import Trash from '../../icons/v1/Trash';
import NotesPaper from '../../icons/v2/NotesPaper';
import ViewHide from '../../icons/v2/ViewHide';
import ViewShow from '../../icons/v2/ViewShow';
import { type CSSProperties, styles, theme } from '../../style';
import { type CommonModalProps } from '../../types/modals';
import Button from '../common/Button';
import Modal from '../common/Modal';
import View from '../common/View';
import Notes from '../Notes';

const BUTTON_HEIGHT = 40;

type CategoryMenuProps = {
  modalProps: CommonModalProps;
  category: CategoryEntity;
  onSave: (category: CategoryEntity) => void;
  onEditNotes: (id: string) => void;
  onDelete: (categoryId: string) => void;
  onBudgetAction: (idx: number, action: string, arg: unknown) => void;
  onClose?: () => void;
};

export default function CategoryMenu({
  modalProps,
  category,
  onSave,
  onEditNotes,
  onDelete,
  onBudgetAction,
  onClose,
}: CategoryMenuProps) {
  const { id } = category;
  const data = useLiveQuery(() => q('notes').filter({ id }).select('*'), [id]);
  const originalNotes = data && data.length > 0 ? data[0].note : null;

  const [name, setName] = useState(category.name);

  function _onClose() {
    modalProps?.onClose();
    onClose?.();
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
    onSave?.({
      ...category,
      hidden: !!!category.hidden,
    });
    _onClose();
  }

  function _onEditNotes() {
    onEditNotes?.(id);
  }

  function _onDelete() {
    onDelete?.(id);
  }

  function onNameChange(newName) {
    _onRename(newName);
    setName(newName);
  }

  const buttonStyle: CSSProperties = {
    ...styles.mediumText,
    flexBasis: '50%',
    height: BUTTON_HEIGHT,
  };

  return (
    <Modal
      title={name}
      titleStyle={styles.underlinedText}
      showHeader={true}
      focusAfterClose={false}
      {...modalProps}
      onClose={_onClose}
      padding={0}
      style={{
        flex: 1,
        height: '50vh',
        padding: '0 10px',
        borderRadius: '6px',
      }}
      editableTitle={true}
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
              flex: 1,
            }}
          >
            <Notes
              notes={originalNotes?.length > 0 ? originalNotes : 'No notes'}
              editable={false}
              focused={false}
              getStyle={editable => ({
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
              paddingBottom: 10,
            }}
          >
            <Button style={buttonStyle} onPointerUp={_onEditNotes}>
              <NotesPaper width={20} height={20} style={{ paddingRight: 5 }} />
              Edit notes
            </Button>
            <Button style={buttonStyle} onPointerUp={_onToggleVisibility}>
              {category.hidden ? (
                <ViewShow width={20} height={20} style={{ paddingRight: 5 }} />
              ) : (
                <ViewHide width={20} height={20} style={{ paddingRight: 5 }} />
              )}
              {category.hidden ? 'Unhide' : 'Hide'}
            </Button>
            <Button style={buttonStyle} onPointerUp={_onDelete}>
              <Trash width={17} height={17} style={{ paddingRight: 5 }} />
              Delete
            </Button>
          </View>
        </View>
      )}
    </Modal>
  );
}
