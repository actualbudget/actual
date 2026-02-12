import { useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';

import { AlignedText } from '@actual-app/components/aligned-text';
import { Button } from '@actual-app/components/button';
import {
  SvgArrowButtonDown1,
  SvgArrowButtonUp1,
} from '@actual-app/components/icons/v2';
import { InitialFocus } from '@actual-app/components/initial-focus';
import { Input } from '@actual-app/components/input';
import { Menu } from '@actual-app/components/menu';
import { Popover } from '@actual-app/components/popover';
import { SpaceBetween } from '@actual-app/components/space-between';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { Tooltip } from '@actual-app/components/tooltip';
import { View } from '@actual-app/components/view';
import { css, cx } from '@emotion/css';

import type { AccountEntity } from 'loot-core/types/models';

import {
  reopenAccount,
  updateAccount,
} from '@desktop-client/accounts/accountsSlice';
import { BalanceHistoryGraph } from '@desktop-client/components/accounts/BalanceHistoryGraph';
import { Link } from '@desktop-client/components/common/Link';
import { Notes } from '@desktop-client/components/Notes';
import { CellValue } from '@desktop-client/components/spreadsheet/CellValue';
import { useContextMenu } from '@desktop-client/hooks/useContextMenu';
import { useIsTestEnv } from '@desktop-client/hooks/useIsTestEnv';
import { useNotes } from '@desktop-client/hooks/useNotes';
import { useSyncedPref } from '@desktop-client/hooks/useSyncedPref';
import { openAccountCloseModal } from '@desktop-client/modals/modalsSlice';
import { useDispatch } from '@desktop-client/redux';
import type { Binding, SheetFields } from '@desktop-client/spreadsheet';

export const accountNameStyle: CSSProperties = {
  marginTop: -2,
  marginBottom: 2,
  paddingTop: 4,
  paddingBottom: 4,
  paddingRight: 15,
  paddingLeft: 18,
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
  titleAccount?: boolean;
  isExactPathMatch?: boolean;
};

function getStatusDotColor({
  pending,
  failed,
}: {
  pending: boolean;
  failed?: boolean;
}): string {
  if (pending) {
    return theme.sidebarItemBackgroundPending;
  }
  if (failed) {
    return theme.sidebarItemBackgroundFailed;
  }
  return theme.sidebarItemBackgroundPositive;
}

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
  titleAccount,
  isExactPathMatch,
}: AccountProps<FieldName>) {
  const isTestEnv = useIsTestEnv();
  const { t } = useTranslation();

  const triggerRef = useRef<HTMLDivElement | null>(null);
  const { setMenuOpen, menuOpen, handleContextMenu, position } =
    useContextMenu();

  const [showBalanceHistory, setShowBalanceHistory] = useSyncedPref(
    `side-nav.show-balance-history-${account?.id}`,
  );

  const dispatch = useDispatch();

  const [isEditing, setIsEditing] = useState(false);

  const accountNote = useNotes(`account-${account?.id}`);
  const isTouchDevice =
    window.matchMedia('(hover: none)').matches ||
    window.matchMedia('(pointer: coarse)').matches;
  const needsTooltip = !!account?.id && !isTouchDevice;

  const accountRow = (
    <View
      style={{ flexShrink: 0, ...outerStyle }}
      onContextMenu={needsTooltip ? handleContextMenu : undefined}
    >
      <View innerRef={triggerRef}>
        <Link
          variant="internal"
          to={to}
          isDisabled={isEditing}
          isExactPathMatch={isExactPathMatch}
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
                  backgroundColor: getStatusDotColor({ pending, failed }),
                  marginLeft: 2,
                  transition: 'transform .3s',
                  opacity: connected ? 1 : 0,
                }),
              )}
            />
          </View>

          <AlignedText
            style={
              titleAccount
                ? {
                    borderBottom: `1.5px solid ${theme.tableBorder}`,
                    paddingBottom: '3px',
                  }
                : undefined
            }
            left={
              isEditing ? (
                <InitialFocus>
                  <Input
                    style={{
                      padding: 0,
                      width: '100%',
                    }}
                    onBlur={() => setIsEditing(false)}
                    onEnter={newAccountName => {
                      if (account && newAccountName.trim() !== '') {
                        dispatch(
                          updateAccount({
                            account: {
                              ...account,
                              name: newAccountName,
                            },
                          }),
                        );
                      }
                      setIsEditing(false);
                    }}
                    onEscape={() => setIsEditing(false)}
                    defaultValue={name}
                  />
                </InitialFocus>
              ) : (
                name
              )
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
            {...position}
          >
            <Menu
              onMenuSelect={menuAction => {
                switch (menuAction) {
                  case 'close': {
                    dispatch(openAccountCloseModal({ accountId: account.id }));
                    break;
                  }
                  case 'reopen': {
                    dispatch(reopenAccount({ id: account.id }));
                    break;
                  }
                  case 'rename': {
                    setIsEditing(true);
                    break;
                  }
                  default: {
                    throw new Error(`Unrecognized menu option: ${menuAction}`);
                  }
                }
                setMenuOpen(false);
              }}
              items={[
                { name: 'rename', text: t('Rename') },
                account.closed
                  ? { name: 'reopen', text: t('Reopen') }
                  : { name: 'close', text: t('Close') },
              ]}
            />
          </Popover>
        )}
      </View>
    </View>
  );

  if (!needsTooltip || isTestEnv) {
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
          <SpaceBetween
            gap={5}
            style={{
              justifyContent: 'space-between',
              '& .hover-visible': {
                opacity: 0,
                transition: 'opacity .25s',
              },
              '&:hover .hover-visible': {
                opacity: 1,
              },
            }}
          >
            <Text
              style={{
                fontWeight: 'bold',
              }}
            >
              {name}
            </Text>
            <Button
              aria-label={t('Toggle balance history')}
              variant="bare"
              onClick={() =>
                setShowBalanceHistory(
                  showBalanceHistory === 'true' ? 'false' : 'true',
                )
              }
              className="hover-visible"
            >
              <SpaceBetween gap={3}>
                {showBalanceHistory === 'true' ? (
                  <SvgArrowButtonUp1 width={10} height={10} />
                ) : (
                  <SvgArrowButtonDown1 width={10} height={10} />
                )}
              </SpaceBetween>
            </Button>
          </SpaceBetween>
          {showBalanceHistory === 'true' && account && (
            <BalanceHistoryGraph
              accountId={account.id}
              style={{ minWidth: 350, minHeight: 70 }}
            />
          )}
          {accountNote && (
            <Notes
              getStyle={() => ({
                borderTop: `1px solid ${theme.tableBorder}`,
                padding: 0,
                paddingTop: '0.5rem',
                marginTop: '0.5rem',
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
        closeDelay: 250,
        isDisabled: menuOpen,
      }}
    >
      {accountRow}
    </Tooltip>
  );
}
