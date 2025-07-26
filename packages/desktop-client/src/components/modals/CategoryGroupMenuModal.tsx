// @ts-strict-ignore
import React, { type ComponentProps, useRef, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import {
  SvgDotsHorizontalTriple,
  SvgAdd,
  SvgTrash,
  SvgCheveronDown,
  SvgCheveronUp,
} from '@actual-app/components/icons/v1';
import {
  SvgNotesPaper,
  SvgViewHide,
  SvgViewShow,
} from '@actual-app/components/icons/v2';
import { Menu } from '@actual-app/components/menu';
import { Popover } from '@actual-app/components/popover';
import { styles, type CSSProperties } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { css } from '@emotion/css';

import {
  Modal,
  ModalCloseButton,
  ModalHeader,
  ModalTitle,
} from '@desktop-client/components/common/Modal';
import { CategoryGroupActionMenu } from '@desktop-client/components/mobile/budget/CategoryGroupActionMenu';
import { Notes } from '@desktop-client/components/Notes';
import { useCategories } from '@desktop-client/hooks/useCategories';
import { useFeatureFlag } from '@desktop-client/hooks/useFeatureFlag';
import { useNotes } from '@desktop-client/hooks/useNotes';
import { useUndo } from '@desktop-client/hooks/useUndo';
import { type Modal as ModalType } from '@desktop-client/modals/modalsSlice';

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
  onApplyBudgetTemplatesInGroup,
}: CategoryGroupMenuModalProps) {
  const [showMore, setShowMore] = useState(false);
  const { grouped: categoryGroups } = useCategories();
  const group = categoryGroups.find(g => g.id === groupId);
  const notes = useNotes(group.id);
  const { showUndoNotification } = useUndo();
  const isGoalTemplatesEnabled = useFeatureFlag('goalTemplatesEnabled');
  const { t } = useTranslation();

  const onRename = newName => {
    if (newName && newName !== group.name) {
      onSave?.({
        ...group,
        name: newName,
      });
    }
  };

  const onShowMore = () => {
    setShowMore(!showMore);
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

  const _onApplyBudgetTemplatesInGroup = () => {
    onApplyBudgetTemplatesInGroup?.(
      group.categories.filter(c => !c.hidden).map(c => c.id),
    );
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

  const actionButtonStyle: CSSProperties = {
    ...styles.mediumText,
    height: styles.mobileMinHeight,
    color: theme.formLabelText,
    // Adjust based on desired number of buttons per row.
    flexBasis: '100%',
  };

  const defaultMenuItemStyle: CSSProperties = {
    ...styles.mobileMenuItem,
    height: styles.mobileMinHeight,
    color: theme.menuItemText,
    borderRadius: 0,
    borderTop: `1px solid ${theme.pillBorder}`,
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
                notes={notes?.length > 0 ? notes : t('No notes')}
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
                <Trans>Add category</Trans>
              </Button>
              <Button style={buttonStyle} onPress={_onEditNotes}>
                <SvgNotesPaper
                  width={20}
                  height={20}
                  style={{ paddingRight: 5 }}
                />
                <Trans>Edit notes</Trans>
              </Button>
              {isGoalTemplatesEnabled && (
                <Button
                  variant="bare"
                  className={css([
                    actionButtonStyle,
                    {
                      '&[data-pressed], &[data-hovered]': {
                        backgroundColor: 'transparent',
                        color: buttonStyle.color,
                      },
                    },
                  ])}
                  onPress={onShowMore}
                >
                  {!showMore ? (
                    <SvgCheveronUp
                      width={30}
                      height={30}
                      style={{ paddingRight: 5 }}
                    />
                  ) : (
                    <SvgCheveronDown
                      width={30}
                      height={30}
                      style={{ paddingRight: 5 }}
                    />
                  )}
                  <Trans>Actions</Trans>
                </Button>
              )}
            </View>
            {showMore && (
              <CategoryGroupActionMenu
                style={{ overflowY: 'auto', paddingTop: 10 }}
                getItemStyle={() => defaultMenuItemStyle}
                onApplyBudgetTemplatesInGroup={() => {
                  _onApplyBudgetTemplatesInGroup();
                  close();
                  showUndoNotification({
                    message: t('budget templates have been applied.'),
                  });
                }}
              />
            )}
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
                    text: group.hidden ? t('Show') : t('Hide'),
                    icon: group.hidden ? SvgViewShow : SvgViewHide,
                    iconSize: 16,
                  },
                  ...(!group.is_income && [
                    Menu.line,
                    {
                      name: 'delete',
                      text: t('Delete'),
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
