import React, { useState } from 'react';

import { useLiveQuery } from 'loot-core/src/client/query-hooks';
import q from 'loot-core/src/shared/query';
import { type CategoryGroupEntity } from 'loot-core/src/types/models';

import Add from '../../icons/v1/Add';
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

type CategoryGroupMenuProps = {
  modalProps: CommonModalProps;
  group: CategoryGroupEntity;
  onSave: (group: CategoryGroupEntity) => void;
  onAddCategory: (groupId: string, isIncome: boolean) => void;
  onToggleVisibility: (isHidden: boolean) => void;
  onEditNotes: (id: string) => void;
  onSaveNotes: (id: string, notes: string) => void;
  onDelete: (groupId: string) => void;
};

export default function CategoryGroupMenu({
  modalProps,
  group,
  onSave,
  onAddCategory,
  onToggleVisibility,
  onEditNotes,
  onDelete,
}: CategoryGroupMenuProps) {
  const { id, hidden } = group;
  const data = useLiveQuery(() => q('notes').filter({ id }).select('*'), [id]);
  const originalNotes = data && data.length > 0 ? data[0].note : null;

  const [name, setName] = useState(group.name);

  function _onClose() {
    modalProps?.onClose();
  }

  function _onRename(newName) {
    if (newName !== name) {
      onSave?.({
        ...group,
        name: newName,
      });
    }
  }

  function _onAddCategory() {
    onAddCategory?.(group.id, group.is_income);
  }

  function _onEditNotes() {
    onEditNotes?.(id);
  }

  function _onToggleVisibility() {
    onToggleVisibility?.(!!hidden);
    _onClose();
  }

  function _onDelete() {
    onDelete?.(id);
    _onClose();
  }

  function onNameChange(newName) {
    _onRename(newName);
    setName(newName);
  }

  const buttonStyle: CSSProperties = {
    fontSize: 17,
    fontWeight: 400,
    flexBasis: '50%',
    height: BUTTON_HEIGHT,
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
        height: '50vh',
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
              flex: 1,
            }}
          >
            <Notes
              notes={originalNotes?.length > 0 ? originalNotes : 'No notes'}
              editable={false}
              focused={false}
              getStyle={editable => ({
                ...styles.mediumText,
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
            <Button style={buttonStyle} onPointerUp={_onAddCategory}>
              <Add width={17} height={17} style={{ paddingRight: 5 }} />
              Add category
            </Button>
            <Button style={buttonStyle} onPointerUp={_onEditNotes}>
              <NotesPaper width={20} height={20} style={{ paddingRight: 5 }} />
              Edit notes
            </Button>
            <Button style={buttonStyle} onPointerUp={_onToggleVisibility}>
              {hidden ? (
                <ViewShow width={20} height={20} style={{ paddingRight: 5 }} />
              ) : (
                <ViewHide width={20} height={20} style={{ paddingRight: 5 }} />
              )}
              {hidden ? 'Unhide' : 'Hide'}
            </Button>
            <Button style={buttonStyle} onPointerUp={_onDelete}>
              <Trash width={20} height={20} style={{ paddingRight: 5 }} />
              Delete
            </Button>
          </View>
        </View>
      )}
    </Modal>
  );
}
