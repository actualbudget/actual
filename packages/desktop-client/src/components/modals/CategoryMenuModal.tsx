// @ts-strict-ignore
import React, { useState } from 'react';

import { useLiveQuery } from 'loot-core/src/client/query-hooks';
import { q } from 'loot-core/src/shared/query';
import { type CategoryEntity } from 'loot-core/src/types/models';

import { useCategories } from '../../hooks/useCategories';
import { SvgDotsHorizontalTriple, SvgTrash } from '../../icons/v1';
import { SvgNotesPaper, SvgViewHide, SvgViewShow } from '../../icons/v2';
import { type CSSProperties, styles, theme } from '../../style';
import { Button } from '../common/Button';
import { Menu } from '../common/Menu';
import { Modal } from '../common/Modal';
import { View } from '../common/View';
import { type CommonModalProps } from '../Modals';
import { Notes } from '../Notes';
import { Tooltip } from '../tooltips';

const BUTTON_HEIGHT = 40;

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
  const { list: categories } = useCategories();
  const category = categories.find(c => c.id === categoryId);
  const data = useLiveQuery(
    () => q('notes').filter({ id: category.id }).select('*'),
    [category.id],
  );
  const originalNotes = data && data.length > 0 ? data[0].note : null;

  function _onClose() {
    modalProps?.onClose();
    onClose?.();
  }

  function _onRename(newName) {
    if (newName !== category.name) {
      onSave?.({
        ...category,
        name: newName,
      });
    }
  }

  function _onToggleVisibility() {
    onSave?.({
      ...category,
      hidden: !category.hidden,
    });
    _onClose();
  }

  function _onEditNotes() {
    onEditNotes?.(category.id);
  }

  function _onDelete() {
    onDelete?.(category.id);
  }

  function onNameUpdate(newName) {
    _onRename(newName);
  }

  const buttonStyle: CSSProperties = {
    ...styles.mediumText,
    height: BUTTON_HEIGHT,
    color: theme.formLabelText,
    // Adjust based on desired number of buttons per row.
    flexBasis: '100%',
  };

  return (
    <Modal
      title={category.name}
      titleStyle={styles.underlinedText}
      showHeader
      focusAfterClose={false}
      {...modalProps}
      onClose={_onClose}
      padding={0}
      style={{
        flex: 1,
        height: '45vh',
        padding: '0 10px',
        borderRadius: '6px',
      }}
      editableTitle={true}
      onTitleUpdate={onNameUpdate}
      leftHeaderContent={
        <AdditionalCategoryMenu
          category={category}
          onDelete={_onDelete}
          onToggleVisibility={_onToggleVisibility}
        />
      }
    >
      {({ isEditingTitle }) => (
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
              margin: '10px 0',
            }}
          >
            <Button
              style={{
                ...buttonStyle,
                display: isEditingTitle ? 'none' : undefined,
              }}
              onClick={_onEditNotes}
            >
              <SvgNotesPaper
                width={20}
                height={20}
                style={{ paddingRight: 5 }}
              />
              Edit notes
            </Button>
          </View>
        </View>
      )}
    </Modal>
  );
}

function AdditionalCategoryMenu({ category, onDelete, onToggleVisibility }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const itemStyle: CSSProperties = {
    ...styles.mediumText,
    height: BUTTON_HEIGHT,
  };

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
              getItemStyle={() => itemStyle}
              items={[
                {
                  name: 'toggleVisibility',
                  text: category.hidden ? 'Show' : 'Hide',
                  icon: category.hidden ? SvgViewShow : SvgViewHide,
                  iconSize: 16,
                },
                Menu.line,
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
