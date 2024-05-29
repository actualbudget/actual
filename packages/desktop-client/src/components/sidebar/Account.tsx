// @ts-strict-ignore
import React from 'react';

import { css } from 'glamor';

import { type AccountEntity } from 'loot-core/src/types/models';

import { useNotes } from '../../hooks/useNotes';
import { styles, theme, type CSSProperties } from '../../style';
import { AlignedText } from '../common/AlignedText';
import { Link } from '../common/Link';
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

function AccountRow(
  account,
  outerStyle: CSSProperties,
  onDragChange,
  onDrop,
  to: string,
  style: CSSProperties,
  updated: boolean,
  pending: boolean,
  failed: boolean,
  connected: boolean,
  name: string,
  query: Binding,
) {
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
              left={name}
              right={<CellValue binding={query} type="financial" />}
            />
          </Link>
        </View>
      </View>
    </View>
  );
}

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
  const accountNote = useNotes(`account-${account?.id}`);
  const needsTooltip = !!account?.id;

  return needsTooltip ? (
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
      className={`${css({
        borderRadius: '0px 5px 5px 0px ! important',
      })}`}
      placement="right top"
      triggerProps={{
        delay: 1000,
      }}
    >
      {AccountRow(
        account,
        outerStyle,
        onDragChange,
        onDrop,
        to,
        style,
        updated,
        pending,
        failed,
        connected,
        name,
        query,
      )}
    </Tooltip>
  ) : (
    AccountRow(
      account,
      outerStyle,
      onDragChange,
      onDrop,
      to,
      style,
      updated,
      pending,
      failed,
      connected,
      name,
      query,
    )
  );
}
