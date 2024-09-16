// @ts-strict-ignore
import React from 'react';

import { css } from 'glamor';
import { SvgExpandArrow } from '../../icons/v0';

import { styles, theme, type CSSProperties } from '../../style';
import { View } from '../common/View';
import { AlignedText } from '../common/AlignedText';
import { Link } from '../common/Link';

import { type SheetFields, type Binding } from '../spreadsheet';
import { CellValue } from '../spreadsheet/CellValue';

type AccountGroupNameProps<FieldName extends SheetFields<'account'>> = {
  groupName: string;
  to?: string;
  query?: Binding<'account', FieldName>;
  connected?: boolean;
  pending?: boolean;
  failed?: boolean;
  updated?: boolean;
  style?: CSSProperties;
  outerStyle?: CSSProperties;
  toggleAccounts?: () => void;
  collapsed?: boolean;
};
  
export function AccountGroupName<FieldName extends SheetFields<'account'>>({
  groupName,
  to,
  query,
  connected,
  pending,
  failed,
  updated,
  style,
  outerStyle,
  toggleAccounts,
  collapsed,
}: AccountGroupNameProps<FieldName>) {
  const accountNameStyle: CSSProperties = {
      marginTop: -2,
      marginBottom: 2,
      paddingTop: 4,
      paddingBottom: 4,
      paddingRight: 15,
    paddingLeft: (toggleAccounts ? 25 : 10),
    textDecoration: 'none',
    color: theme.sidebarItemText,
      ':hover': { backgroundColor: theme.sidebarItemBackgroundHover },
    ...styles.smallText,
  };

  return (
    <View
      style={{
        flexShrink: 0,
//        paddingLeft: 5,
//        ':hover': { backgroundColor: theme.sidebarItemBackgroundHover },
//        ...outerStyle
      }}
    >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            position: 'relative',
//            borderBottom: !collapsed && `1.5px solid rgba(255,255,255,0.4)`,
//            paddingBottom: !collapsed && '3px',
//            marginRight: 15,
//            marginLeft: 5,
//            paddingTop: 4,
//            marginBottom: 4,
          }}
        >
          {toggleAccounts && 
            <SvgExpandArrow
              width={12}
              height={12}
              onClick={toggleAccounts}
              style={{
                position: 'absolute',
                zIndex: 99999,
                marginTop: -2,
                marginBottom: 5,
                marginLeft: 7,
                width: 18,
                height: 18,
                padding: 3,
                transition: 'transform .1s',
                transform: (collapsed) ? 'rotate(-90deg)' : '',
              }}
            />
          }
          <Link
            variant="internal"
            to={to || 'javascript:void()'}
            style={{
              ...accountNameStyle,
              ...style,
              flex: 1,
              fontWeight: 600,
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
              //fontWeight: (style && style.fontWeight) || 'normal',
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
              style={{
                borderBottom: !collapsed && `1.5px solid rgba(255,255,255,0.4)`,
                paddingBottom: !collapsed && '3px',
              }}
              left={groupName}
              right={(query && <CellValue binding={query} type="financial" />)}
            />
          </Link>
        </View>
    </View>
  );
}