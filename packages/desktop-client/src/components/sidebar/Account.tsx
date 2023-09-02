import React, { type CSSProperties } from 'react';

import { css } from 'glamor';

import { type AccountEntity } from 'loot-core/src/types/models';

// eslint-disable-next-line no-restricted-imports
import { styles, colors } from '../../style';
import AlignedText from '../common/AlignedText';
import AnchorLink from '../common/AnchorLink';
import View from '../common/View';
import {
  useDraggable,
  useDroppable,
  DropHighlight,
  type OnDragChangeCallback,
  type OnDropCallback,
} from '../sort';
import { type Binding } from '../spreadsheet';
import CellValue from '../spreadsheet/CellValue';

const accountNameStyle = {
  marginTop: -2,
  marginBottom: 2,
  paddingTop: 4,
  paddingBottom: 4,
  paddingRight: 15,
  paddingLeft: 10,
  textDecoration: 'none',
  color: colors.n9,
  ':hover': { backgroundColor: colors.n2 },
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
  outerStyle?: CSSProperties;
  onDragChange?: OnDragChangeCallback;
  onDrop?: OnDropCallback;
};

function Account({
  name,
  account,
  connected,
  failed,
  updated,
  to,
  query,
  style,
  outerStyle,
  onDragChange,
  onDrop,
}: AccountProps) {
  let type = account
    ? account.closed
      ? 'account-closed'
      : account.offbudget
      ? 'account-offbudget'
      : 'account-onbudget'
    : 'title';

  let { dragRef } = useDraggable({
    type,
    onDragChange,
    item: { id: account && account.id },
    canDrag: account != null,
  });

  let { dropRef, dropPos } = useDroppable({
    types: account ? [type] : [],
    id: account && account.id,
    onDrop: onDrop,
  });

  const dotStyle = {
    '& .dot': {
      backgroundColor: colors.p8,
      transform: 'translateX(-4.5px)',
    },
  };

  return (
    <View innerRef={dropRef} style={{ flexShrink: 0, ...outerStyle }}>
      <View>
        <DropHighlight pos={dropPos} />
        <View innerRef={dragRef}>
          <AnchorLink
            to={to}
            style={{
              ...accountNameStyle,
              ...style,
              position: 'relative',
              borderLeft: '4px solid transparent',
              ...(updated && { fontWeight: 700 }),
            }}
            activeStyle={{
              borderColor: colors.p8,
              color: colors.p8,
              // This is kind of a hack, but we don't ever want the account
              // that the user is looking at to be "bolded" which means it
              // has unread transactions. The system does mark is read and
              // unbolds it, but it still "flashes" bold so this just
              // ignores it if it's active
              fontWeight: (style && style.fontWeight) || 'normal',
              ...dotStyle,
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
                className="dot"
                {...css({
                  marginRight: 3,
                  width: 5,
                  height: 5,
                  borderRadius: 5,
                  backgroundColor: failed ? colors.r7 : colors.g5,
                  marginLeft: 2,
                  transition: 'transform .3s',
                  opacity: connected ? 1 : 0,
                })}
              />
            </View>

            <AlignedText
              left={name}
              right={<CellValue binding={query} type="financial" />}
            />
          </AnchorLink>
        </View>
      </View>
    </View>
  );
}

export { accountNameStyle };
export default Account;
