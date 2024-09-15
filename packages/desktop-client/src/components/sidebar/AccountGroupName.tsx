// @ts-strict-ignore
import React, { useState } from 'react';

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
  showAccounts?: boolean;
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
  showAccounts,
}: AccountGroupNameProps<FieldName>) {
  const accountNameStyle: CSSProperties = {
    paddingLeft: 5,
    textDecoration: 'none',
    color: theme.sidebarItemText,
    ...styles.smallText,
  };

  return (
    <View
      style={{
        flexShrink: 0,
        paddingLeft: 5,
        ':hover': { backgroundColor: theme.sidebarItemBackgroundHover },
        ...outerStyle
      }}
    >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            borderBottom: showAccounts && `1.5px solid rgba(255,255,255,0.4)`,
            paddingBottom: showAccounts && '3px',
            marginRight: 15,
            marginLeft: 5,
            paddingTop: 4,
            marginBottom: 4,
          }}
        >
          {toggleAccounts && 
            <SvgExpandArrow
              width={12}
              height={12}
              onClick={toggleAccounts}
              style={{
                transition: 'transform .1s',
                transform: (showAccounts) ? '' : 'rotate(-90deg)',
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
              ...(updated && { fontWeight: 700 }),
            }}
            activeStyle={{
              color: theme.sidebarItemTextSelected,
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
              style={
                (showAccounts) && {
//                  borderBottom: `1.5px solid rgba(255,255,255,0.4)`,
//                  paddingBottom: '3px',
                }
              }
              left={groupName}
              right={(query && <CellValue binding={query} type="financial" />)}
            />
          </Link>
        </View>
    </View>
  );
}