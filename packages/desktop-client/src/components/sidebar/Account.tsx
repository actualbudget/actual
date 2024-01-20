// @ts-strict-ignore
import React from 'react';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { css } from 'glamor';

import { type AccountEntity } from 'loot-core/src/types/models';

import { styles, theme, type CSSProperties } from '../../style';
import { AlignedText } from '../common/AlignedText';
import { AnchorLink } from '../common/AnchorLink';
import { View } from '../common/View';
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
  failed?: boolean;
  updated?: boolean;
  style?: CSSProperties;
};

export function Account({
  name,
  account,
  connected,
  failed,
  updated,
  to,
  query,
  style,
}: AccountProps) {
  const {
    isDragging,
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: account?.id || `sortable-account-${name}` });

  const dndStyle = {
    opacity: isDragging ? 0.5 : undefined,
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <View
      innerRef={setNodeRef}
      style={{ flexShrink: 0, ...dndStyle }}
      {...attributes}
      {...listeners}
    >
      <AnchorLink
        to={to}
        style={{
          ...accountNameStyle,
          ...style,
          position: 'relative',
          borderLeft: '4px solid transparent',
          ...(updated && { fontWeight: 700 }),
          ...(isDragging && { pointerEvents: 'none' }),
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
              backgroundColor: failed
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
      </AnchorLink>
    </View>
  );
}
