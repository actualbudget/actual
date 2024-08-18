// @ts-strict-ignore
import React from 'react';

import { styles, theme, type CSSProperties } from '../../style';
import { AlignedText } from '../common/AlignedText';
import { Link } from '../common/Link';
import { View } from '../common/View';
import {
  useDroppable,
  type OnDragChangeCallback,
  type OnDropCallback,
} from '../sort';
import { type SheetFields, type Binding } from '../spreadsheet';
import { CellValue } from '../spreadsheet/CellValue';


const accountNameStyle: CSSProperties = {
  marginTop: -2,
  marginBottom: 2,
  paddingTop: 4,
  paddingBottom: 4,
  paddingRight: 15,
  paddingLeft: 10,
  textDecoration: 'none',
  color: theme.sidebarItemText,
  ...styles.smallText,
};

type AccountProps<FieldName extends SheetFields<'account'>> = {
  groupName: string;
  to: string;
  query: Binding<'account', FieldName>;
  accounts: any;
  connected?: boolean;
  pending?: boolean;
  failed?: boolean;
  updated?: boolean;
  style?: CSSProperties;
  outerStyle?: CSSProperties;
  grouped?: boolean;
  onDragChange?: OnDragChangeCallback<{ id: string }>;
  onDrop?: OnDropCallback;
};

//pretty much a copy of account but for the nested account groups
export function GroupAccount<FieldName extends SheetFields<'account'>>({
  groupName,
  accounts,
  updated,
  to,
  query,
  style,
  outerStyle,
}: AccountProps<FieldName>) {
  const accountRow = (
    <View style={{ flexShrink: 0, ...outerStyle, marginBottom: '10px' }}>
      <View>
        <View>
          <View
            style={{
              position: 'absolute',
              display: 'flex',
              background: 'rgba(255,255,255,0.05)',
              borderRadius: '5px',
              borderTopLeftRadius: '5px',
              borderTopRightRadius: '5px',
              borderBottomLeftRadius: '0px',
              borderBottomRightRadius: '0px',
              height: '100%',
              width: 'calc(100% - 1.9em)',
              marginLeft: '1em',
              padding: '2px',
              border: '0px solid rgba(255,255,255,.02)',
              boxShadow: '-1px 1px 1px 1px rgba(0,0,0,.3)',
            }}
          />

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
                display: 'flex',
                top: 0,
                left: 0,
                background: 'rgba(255,255,255,0.06)',
                borderTopLeftRadius: '5px',
                borderTopRightRadius: '5px',
                borderBottomLeftRadius: '0px',
                borderBottomRightRadius: '0px',
                height: 'calc(100% - 2px)',
                marginLeft: '.5em',
                width: 'calc(100% - 1.4em)',
                borderBottom: '1px solid rgba(255,255,255,.1)',
              }}
            />
            <AlignedText
              style={{
                paddingBottom: '4px',
                fontWeight: '450',
              }}
              left={groupName}
              right={<CellValue binding={query} type="financial" style={{}} />}
            />
          </Link>
          <View style={{ marginLeft: '1em' }}>{accounts}</View>
        </View>
      </View>
    </View>
  );

  return accountRow;
}
