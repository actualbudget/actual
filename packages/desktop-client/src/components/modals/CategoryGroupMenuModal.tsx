// @ts-strict-ignore
import React, {
  type ComponentProps,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import { useTranslation } from 'react-i18next';

import { type Modal as ModalType } from 'loot-core/client/modals/modalsSlice';

import { useCategories } from '../../hooks/useCategories';
import { useNotes } from '../../hooks/useNotes';
import { SvgDotsHorizontalTriple, SvgAdd, SvgTrash } from '../../icons/v1';
import { SvgNotesPaper, SvgViewHide, SvgViewShow } from '../../icons/v2';
import { styles, theme } from '../../style';
import { Button } from '../common/Button2';
import { Menu } from '../common/Menu';
import {
  Modal,
  ModalCloseButton,
  ModalHeader,
  ModalTitle,
} from '../common/Modal';
import { Popover } from '../common/Popover';
import { View } from '../common/View';
import { Notes } from '../Notes';

type CategoryGroupMenuModalProps = Extract<
  ModalType,
  { name: 'category-group-menu' }
>['options'];

export function CategoryGroupMenuModal({
  groupId,
  onSave,
  onAddCategory,
  onEditNotes,
  onDelete,
  onToggleVisibility,
  onClose,
}: CategoryGroupMenuModalProps) {
  const { t } = useTranslation();
  const { grouped: categoryGroups } = useCategories();
  const group = categoryGroups.find(g => g.id === groupId);
  const notes = useNotes(group.id);

  const onRename = newName => {
    if (newName && newName !== group.name) {
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

  const _onDelete = () => {
    onDelete?.(group.id);
  };

  const _onToggleVisibility = () => {
    onToggleVisibility?.(group.id);
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
      name="category-group-menu"
      onClose={onClose}
      containerProps={{
        style: {
          height: '45vh',
        },
      }}
    >
      {({ state: { close } }) => (
        <>
          <ModalHeader
            leftContent={
              <AdditionalCategoryGroupMenu
                group={group}
                onDelete={_onDelete}
                onToggleVisibility={_onToggleVisibility}
              />
            }
            title={
              <ModalTitle
                isEditable
                title={group.name}
                onTitleUpdate={onRename}
              />
            }
            rightContent={<ModalCloseButton onPress={close} />}
          />
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
              <Button style={buttonStyle} onPress={_onAddCategory}>
                <SvgAdd width={17} height={17} style={{ paddingRight: 5 }} />
                {t('Add category')}
              </Button>
              <Button style={buttonStyle} onPress={_onEditNotes}>
                <SvgNotesPaper
                  width={20}
                  height={20}
                  style={{ paddingRight: 5 }}
                />
                {t('Edit notes')}
              </Button>
            </View>
          </View>
        </>
      )}
    </Modal>
  );
}

function AdditionalCategoryGroupMenu({ group, onDelete, onToggleVisibility }) {
  const { t } = useTranslation();
  const triggerRef = useRef(null);
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
          ref={triggerRef}
          variant="bare"
          aria-label={t('Menu')}
          onPress={() => {
            setMenuOpen(true);
          }}
        >
          <SvgDotsHorizontalTriple
            width={17}
            height={17}
            style={{ color: 'currentColor' }}
          />
          <Popover
            triggerRef={triggerRef}
            isOpen={menuOpen}
            placement="bottom start"
            onOpenChange={() => setMenuOpen(false)}
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
                ].filter(i => i != null) as ComponentProps<typeof Menu>['items']
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
          </Popover>
        </Button>
      )}
    </View>
  );
}
