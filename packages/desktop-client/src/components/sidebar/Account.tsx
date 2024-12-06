// @ts-strict-ignore
import React, { type CSSProperties, useEffect, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';

import { css, cx } from '@emotion/css';

import {
  openAccountCloseModal,
  reopenAccount,
  updateAccount,
} from 'loot-core/client/actions';
import * as Platform from 'loot-core/client/platform';
import { type AccountEntity } from 'loot-core/src/types/models';

import { useFeatureFlag } from '../../hooks/useFeatureFlag';
import { useNotes } from '../../hooks/useNotes';
import { styles, theme } from '../../style';
import { AlignedText } from '../common/AlignedText';
import { Link } from '../common/Link';
import { Menu } from '../common/Menu';
import { Popover } from '../common/Popover';
import { Text } from '../common/Text';
import { Tooltip } from '../common/Tooltip';
import { View } from '../common/View';
import { Notes } from '../Notes';
import {
  useDraggable,
  useDroppable,
  DropHighlight,
  type OnDragChangeCallback,
  type OnDropCallback,
} from '../sort';
import { type SheetFields, type Binding } from '../spreadsheet';
import { CellValue } from '../spreadsheet/CellValue';

export const accountNameStyle: CSSProperties = {
  marginTop: -2,
  marginBottom: 2,
  paddingTop: 4,
  paddingBottom: 4,
  paddingRight: 15,
  paddingLeft: 10,
  textDecoration: 'none',
  color: theme.sidebarItemText,
  ':hover': { backgroundColor: theme.sidebarItemBackgroundHover },
  ...styles.smallText,
};

type AccountProps<FieldName extends SheetFields<'account'>> = {
  name: string;
  to: string;
  query: Binding<'account', FieldName>;
  account?: AccountEntity;
  connected?: boolean;
  pending?: boolean;
  failed?: boolean;
  updated?: boolean;
  style?: CSSProperties;
  outerStyle?: CSSProperties;
  onDragChange?: OnDragChangeCallback<{ id: string }>;
  onDrop?: OnDropCallback;
};

export function Account<FieldName extends SheetFields<'account'>>({
  name,
  account,
  connected,
  pending = false,
  failed,
  updated,
  to,
  query,
  style,
  outerStyle,
  onDragChange,
  onDrop,
}: AccountProps<FieldName>) {
  const type = account
    ? account.closed
      ? 'account-closed'
      : account.offbudget
        ? 'account-offbudget'
        : 'account-onbudget'
    : 'title';

  const triggerRef = useRef(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const contextMenusEnabled = useFeatureFlag('contextMenus');
  const [crossOffset, setCrossOffset] = useState(0);
  const [offset, setOffset] = useState(0);

  const { dragRef } = useDraggable({
    type,
    onDragChange,
    item: { id: account && account.id },
    canDrag: account != null,
  });

  const { dropRef, dropPos } = useDroppable({
    types: account ? [type] : [],
    id: account && account.id,
    onDrop,
  });

  const dispatch = useDispatch();

  const editingRef = useRef(null);
  const [isEditing, setIsEditing] = useState(false);
  useEffect(() => {
    if (!editingRef.current) return;
    if (isEditing) {
      editingRef.current.focus();
      window.getSelection().selectAllChildren(editingRef.current);
    } else {
      editingRef.current.textContent = name;
    }
  }, [name, isEditing]);

  const updateName = () => {
    if (account && isEditing) {
      setIsEditing(false);
      const newName = editingRef.current.textContent;
      if (newName !== account.name && newName.trim()) {
        dispatch(
          updateAccount({
            ...account,
            name: newName,
          }),
        );
      }
    }
  };

  const accountNote = useNotes(`account-${account?.id}`);
  const needsTooltip = !!account?.id;

  const accountRow = (
    <View
      innerRef={dropRef}
      style={{ flexShrink: 0, ...outerStyle }}
      onContextMenu={e => {
        if (!needsTooltip || !contextMenusEnabled) return;
        e.preventDefault();
        const rect = e.currentTarget.getBoundingClientRect();
        setCrossOffset(e.clientX - rect.left);
        setOffset(e.clientY - rect.bottom);
        setMenuOpen(true);
      }}
    >
      <View innerRef={triggerRef}>
        <DropHighlight pos={dropPos} />
        <View innerRef={dragRef}>
          <Link
            variant="internal"
            to={to}
            style={{
              ...accountNameStyle,
              ...style,
              position: 'relative',
              borderLeft: '4px solid transparent',
              ...(updated && { fontWeight: 700 }),
            }}
            activeStyle={{
              borderColor: theme.sidebarItemAccentSelected,
              color: theme.sidebarItemTextSelected,
              // This is kind of a hack, but we don't ever want the account
              // that the user is looking at to be "bolded" which means it
              // has unread transactions. The system does mark is read and
              // unbolds it, but it still "flashes" bold so this just
              // ignores it if it's active
              fontWeight: (style && style.fontWeight) || 'normal',
              '& .dot': {
                backgroundColor: theme.sidebarItemAccentSelected,
                transform: 'translateX(-4.5px)',
              },
            }}
          >
            <View
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                flexDirection: 'row',
                alignItems: 'center',
              }}
            >
              <div
                className={cx(
                  'dot',
                  css({
                    marginRight: 3,
                    width: 5,
                    height: 5,
                    borderRadius: 5,
                    backgroundColor: pending
                      ? theme.sidebarItemBackgroundPending
                      : failed
                        ? theme.sidebarItemBackgroundFailed
                        : theme.sidebarItemBackgroundPositive,
                    marginLeft: 2,
                    transition: 'transform .3s',
                    opacity: connected ? 1 : 0,
                  }),
                )}
              />
            </View>

            <AlignedText
              style={
                (name === 'Off budget' || name === 'For budget') && {
                  borderBottom: `1.5px solid rgba(255,255,255,0.4)`,
                  paddingBottom: '3px',
                }
              }
              left={
                <span
                  contentEditable={isEditing}
                  ref={editingRef}
                  suppressContentEditableWarning={true}
                  onBlur={updateName}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      updateName();
                    } else if (e.key === 'Escape') {
                      setIsEditing(false);
                    }
                  }}
                >
                  {name}
                </span>
              }
              right={<CellValue binding={query} type="financial" />}
            />
          </Link>
          {account && (
            <Popover
              triggerRef={triggerRef}
              placement="bottom start"
              isOpen={menuOpen}
              onOpenChange={() => setMenuOpen(false)}
              style={{ width: 200, margin: 1 }}
              isNonModal
              crossOffset={crossOffset}
              offset={offset}
            >
              <Menu
                onMenuSelect={type => {
                  switch (type) {
                    case 'close': {
                      dispatch(openAccountCloseModal(account.id));
                      break;
                    }
                    case 'reopen': {
                      dispatch(reopenAccount(account.id));
                      break;
                    }
                    case 'rename': {
                      setIsEditing(true);
                      break;
                    }
                  }
                  setMenuOpen(false);
                }}
                items={[
                  { name: 'rename', text: 'Rename' },
                  account.closed
                    ? { name: 'reopen', text: 'Reopen' }
                    : { name: 'close', text: 'Close' },
                ]}
              />
            </Popover>
          )}
        </View>
      </View>
    </View>
  );

  if (!needsTooltip || Platform.isPlaywright) {
    return accountRow;
  }

  return (
    <Tooltip
      content={
        <View
          style={{
            padding: 10,
          }}
        >
          <Text
            style={{
              fontWeight: 'bold',
              borderBottom: accountNote ? `1px solid ${theme.tableBorder}` : 0,
              marginBottom: accountNote ? '0.5rem' : 0,
            }}
          >
            {name}
          </Text>
          {accountNote && (
            <Notes
              getStyle={() => ({
                padding: 0,
              })}
              notes={accountNote}
            />
          )}
        </View>
      }
      style={{ ...styles.tooltip, borderRadius: '0px 5px 5px 0px' }}
      placement="right top"
      triggerProps={{
        delay: 1000,
      }}
    >
      {accountRow}
    </Tooltip>
  );
}
