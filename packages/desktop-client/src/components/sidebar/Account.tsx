// @ts-strict-ignore
import React from 'react';

import { css } from 'glamor';

import { type AccountEntity } from 'loot-core/src/types/models';

import { useNotes } from '../../hooks/useNotes';
import { styles, theme, type CSSProperties } from '../../style';
import { AlignedText } from '../common/AlignedText';
import { Link } from '../common/Link';
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
import { type Binding } from '../spreadsheet';
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

type AccountProps = {
  name: string;
  to: string;
  query: Binding;
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

export function Account({
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
}: AccountProps) {
  const type = account
    ? account.closed
      ? 'account-closed'
      : account.offbudget
        ? 'account-offbudget'
        : 'account-onbudget'
    : 'title';

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

  const accountNote = useNotes(`account-${account?.id}`);
  const note = `**${name}**` + (accountNote ? `\n\n${accountNote}` : '');

  return (
    <View innerRef={dropRef} style={{ flexShrink: 0, ...outerStyle }}>
      <View>
        <DropHighlight pos={dropPos} />
        <View innerRef={dragRef}>
          <Link
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
                className={`dot ${css({
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
                })}`}
              />
            </View>

            <AlignedText
              left={
                <Tooltip
                  content={<Notes notes={note} />}
                  placement="bottom left"
                  triggerProps={{
                    delay: 1000,
                  }}
                >
                  {name}
                </Tooltip>
              }
              right={<CellValue binding={query} type="financial" />}
            />
          </Link>
        </View>
      </View>
    </View>
  );
}
