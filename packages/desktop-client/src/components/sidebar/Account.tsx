// @ts-strict-ignore
import React, { type CSSProperties, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { AlignedText } from '@actual-app/components/aligned-text';
import { InitialFocus } from '@actual-app/components/initial-focus';
import { Menu } from '@actual-app/components/menu';
import { Popover } from '@actual-app/components/popover';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { Tooltip } from '@actual-app/components/tooltip';
import { View } from '@actual-app/components/view';
import { css, cx } from '@emotion/css';

import { openAccountCloseModal } from 'loot-core/client/actions';
import * as Platform from 'loot-core/client/platform';
import {
  reopenAccount,
  updateAccount,
} from 'loot-core/client/queries/queriesSlice';
import { currencyToInteger } from 'loot-core/shared/util';
import { type AccountEntity } from 'loot-core/types/models';

import { useContextMenu } from '../../hooks/useContextMenu';
import { useNavigate } from '../../hooks/useNavigate';
import { useNotes } from '../../hooks/useNotes';
import { useDispatch } from '../../redux';
import { Input } from '../common/Input';
import { Link } from '../common/Link';
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
import { useFormat } from '../spreadsheet/useFormat';
import { useSheetValue } from '../spreadsheet/useSheetValue';

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
  const { t } = useTranslation();

  const type = account
    ? account.closed
      ? 'account-closed'
      : account.offbudget
        ? 'account-offbudget'
        : 'account-onbudget'
    : 'title';

  const triggerRef = useRef(null);
  const { setMenuOpen, menuOpen, handleContextMenu, position } =
    useContextMenu();

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

  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingBalance, setIsEditingBalance] = useState(false);

  const accountNote = useNotes(`account-${account?.id}`);
  const needsTooltip = !!account?.id;

  const accountValue = useSheetValue(query);
  const navigate = useNavigate();
  const format = useFormat();

  const accountRow = (
    <View
      innerRef={dropRef}
      style={{ flexShrink: 0, ...outerStyle }}
      onContextMenu={needsTooltip ? handleContextMenu : undefined}
    >
      <View innerRef={triggerRef}>
        <DropHighlight pos={dropPos} />
        <View innerRef={dragRef}>
          <Link
            variant="internal"
            to={to}
            isDisabled={isEditingName}
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
                (name === 'Off budget' || name === 'On budget') && {
                  borderBottom: `1.5px solid rgba(255,255,255,0.4)`,
                  paddingBottom: '3px',
                }
              }
              left={
                isEditingName ? (
                  <InitialFocus>
                    <Input
                      style={{
                        padding: 0,
                        width: '100%',
                      }}
                      onBlur={() => setIsEditingName(false)}
                      onEnter={e => {
                        const inputEl = e.target as HTMLInputElement;
                        const newAccountName = inputEl.value;
                        if (newAccountName.trim() !== '') {
                          dispatch(
                            updateAccount({
                              account: {
                                ...account,
                                name: newAccountName,
                              },
                            }),
                          );
                        }
                        setIsEditingName(false);
                      }}
                      onEscape={() => setIsEditingName(false)}
                      defaultValue={name}
                    />
                  </InitialFocus>
                ) : (
                  name
                )
              }
              right={
                isEditingBalance ? (
                  <InitialFocus>
                    <Input
                      style={{
                        padding: 0,
                        width: '100%',
                        textAlign: 'right',
                        ...styles.tnum,
                      }}
                      onBlur={() => setIsEditingBalance(false)}
                      onEnter={e => {
                        const inputEl = e.target as HTMLInputElement;
                        const newValue = inputEl.value;
                        if (newValue.trim() !== '') {
                          const v = currencyToInteger(newValue);
                          navigate(to, { state: { reconcileAmount: v } });
                        }
                        setIsEditingBalance(false);
                      }}
                      onEscape={() => setIsEditingBalance(false)}
                      defaultValue={format(accountValue, 'financial')}
                    />
                  </InitialFocus>
                ) : (
                  <CellValue binding={query} type="financial" />
                )
              }
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
              {...position}
            >
              <Menu
                onMenuSelect={type => {
                  switch (type) {
                    case 'close': {
                      dispatch(openAccountCloseModal(account.id));
                      break;
                    }
                    case 'reopen': {
                      dispatch(reopenAccount({ id: account.id }));
                      break;
                    }
                    case 'rename': {
                      setIsEditingName(true);
                      break;
                    }
                    case 'reconcile': {
                      setIsEditingBalance(true);
                      break;
                    }
                  }
                  setMenuOpen(false);
                }}
                items={[
                  { name: 'rename', text: t('Rename') },
                  { name: 'reconcile', text: t('Reconcile') },
                  account.closed
                    ? { name: 'reopen', text: t('Reopen') }
                    : { name: 'close', text: t('Close') },
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
        isDisabled: menuOpen,
      }}
    >
      {accountRow}
    </Tooltip>
  );
}
