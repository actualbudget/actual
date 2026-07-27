// @ts-strict-ignore
import React, { useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';

import { AlignedText } from '@actual-app/components/aligned-text';
import { Button } from '@actual-app/components/button';
import {
  SvgAlertTriangle,
  SvgArrowButtonDown1,
  SvgArrowButtonUp1,
  SvgCheckCircle1,
} from '@actual-app/components/icons/v2';
import { InitialFocus } from '@actual-app/components/initial-focus';
import { Input } from '@actual-app/components/input';
import { SpaceBetween } from '@actual-app/components/space-between';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { Tooltip } from '@actual-app/components/tooltip';
import { View } from '@actual-app/components/view';
import type { AccountEntity } from '@actual-app/core/types/models';
import { css, cx } from '@emotion/css';

import { useReopenAccountMutation, useUpdateAccountMutation } from '#accounts';
import { getReconciliationStatus } from '#accounts/reconciliationStatus';
import { BalanceHistoryGraph } from '#components/accounts/BalanceHistoryGraph';
import { Link } from '#components/common/Link';
import { Notes } from '#components/Notes';
import { DropHighlight, useDraggable, useDroppable } from '#components/sort';
import type { OnDragChangeCallback, OnDropCallback } from '#components/sort';
import { CellValue } from '#components/spreadsheet/CellValue';
import { useContextMenu } from '#hooks/useContextMenu';
import { useDragRef } from '#hooks/useDragRef';
import { useIsTestEnv } from '#hooks/useIsTestEnv';
import { useLocalPref } from '#hooks/useLocalPref';
import { useNotes } from '#hooks/useNotes';
import { useSheetValue } from '#hooks/useSheetValue';
import { useSyncedPref } from '#hooks/useSyncedPref';
import { openAccountCloseModal } from '#modals/modalsSlice';
import { useDispatch, useSelector } from '#redux';
import type { Binding, SheetFields } from '#spreadsheet';
import * as bindings from '#spreadsheet/bindings';

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
  titleAccount?: boolean;
  isExactPathMatch?: boolean;
  balanceTestId?: string;
  // 'compact' hides the inline balance (shown in the hover tooltip
  // instead); omitted (full width) shows it inline as before.
  widthMode?: 'compact' | 'full';
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
  titleAccount,
  isExactPathMatch,
  balanceTestId,
  widthMode = 'full',
}: AccountProps<FieldName>) {
  const isTestEnv = useIsTestEnv();
  const { t } = useTranslation();
  const type = account
    ? account.closed
      ? 'account-closed'
      : account.offbudget
        ? 'account-offbudget'
        : 'account-onbudget'
    : 'title';

  const triggerRef = useRef(null);

  const { dragRef } = useDraggable({
    type,
    onDragChange,
    item: { id: account && account.id },
    canDrag: account != null,
  });
  const handleDragRef = useDragRef(dragRef);

  const { dropRef, dropPos } = useDroppable({
    types: account ? [type] : [],
    id: account && account.id,
    onDrop,
  });

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
  const reopenAccount = useReopenAccountMutation();
  const updateAccount = useUpdateAccountMutation();

  const unreconciledCount = useSheetValue<'account', 'unreconciledCount'>(
    bindings.accountUnreconciledCount(account?.id ?? ''),
  );
  const reconciliationStatus = account
    ? getReconciliationStatus(account.last_reconciled, unreconciledCount)
    : 'never';

  const balanceCell = <CellValue binding={query} type="financial" />;

  const [pinnedAccountIds, setPinnedAccountIdsPref] = useLocalPref(
    'sidebar.pinnedAccountIds',
  );
  const isPinned = !!account && !!pinnedAccountIds?.includes(account.id);
  const togglePin = () => {
    if (!account) return;
    const current = pinnedAccountIds ?? [];
    setPinnedAccountIdsPref(
      isPinned
        ? current.filter(id => id !== account.id)
        : [...current, account.id],
    );
  };

  const isContextMenuOpen = useSelector(state =>
    state.contextMenu.items.some(
      i =>
        typeof i === 'object' && 'name' in i && i.name.startsWith('account-'),
    ),
  );
  useContextMenu({
    triggerRef,
    enabled: account && needsTooltip,
    items: [
      {
        name: 'account-rename',
        text: t('Rename'),
        onClick: () => setIsEditing(true),
      },
      {
        name: 'account-toggle-pin',
        text: isPinned ? t('Unpin from rail') : t('Pin to rail'),
        onClick: togglePin,
      },
      account?.closed
        ? {
            name: 'account-reopen',
            text: t('Reopen'),
            onClick: () => reopenAccount.mutate({ id: account.id }),
          }
        : {
            name: 'account-close',
            text: t('Close'),
            onClick: () =>
              dispatch(openAccountCloseModal({ accountId: account.id })),
          },
    ],
  });

  const accountRow = (
    <View innerRef={dropRef} style={{ flexShrink: 0, ...outerStyle }}>
      <View innerRef={triggerRef}>
        <DropHighlight pos={dropPos} />
        <View innerRef={handleDragRef}>
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
              ...(updated && {
                fontWeight: 700,
                color: theme.sidebarItemTextUpdated,
              }),
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
                    marginLeft: 2,
                    transition: 'transform .3s, opacity .2s',
                    boxSizing: 'border-box',
                    ...(!account
                      ? // Title rows ("All accounts", "On budget", …) keep an
                        // invisible dot so the text still lines up.
                        {
                          backgroundColor: theme.sidebarItemBackgroundPositive,
                          opacity: 0,
                        }
                      : connected
                        ? {
                            backgroundColor: pending
                              ? theme.sidebarItemBackgroundPending
                              : failed
                                ? theme.sidebarItemBackgroundFailed
                                : theme.sidebarItemBackgroundPositive,
                            opacity: 1,
                          }
                        : // Manual account, no bank connection: a hollow ring
                          // rather than nothing, so it's a real status and
                          // not just a missing dot.
                          {
                            backgroundColor: 'transparent',
                            border: `1.5px solid ${theme.pageTextSubdued}`,
                            opacity: 1,
                          }),
                  }),
                )}
              />
            </View>

            <AlignedText
              style={
                titleAccount && {
                  borderBottom: `1.5px solid rgba(255,255,255,0.4)`,
                  paddingBottom: '3px',
                }
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
                        if (newAccountName.trim() !== '') {
                          updateAccount.mutate({
                            account: {
                              ...account,
                              name: newAccountName,
                            },
                          });
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
              right={
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  {reconciliationStatus === 'reconciled' && (
                    <span
                      title={t('Reconciled')}
                      style={{ display: 'flex', flexShrink: 0 }}
                    >
                      <SvgCheckCircle1
                        width={12}
                        height={12}
                        style={{ color: theme.noticeText }}
                      />
                    </span>
                  )}
                  {reconciliationStatus === 'needs-review' && (
                    <span
                      title={t('Activity since last reconcile')}
                      style={{ display: 'flex', flexShrink: 0 }}
                    >
                      <SvgAlertTriangle
                        width={11}
                        height={11}
                        style={{ color: theme.warningText }}
                      />
                    </span>
                  )}
                  {widthMode === 'full' &&
                    (balanceTestId ? (
                      <View data-testid={balanceTestId}>{balanceCell}</View>
                    ) : (
                      balanceCell
                    ))}
                </View>
              }
            />
          </Link>
        </View>
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
            <View>
              <Text style={{ fontWeight: 'bold' }}>{name}</Text>
              {widthMode === 'compact' && (
                <Text style={{ color: theme.pageTextSubdued }}>
                  {balanceCell}
                </Text>
              )}
            </View>
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
        isDisabled: isContextMenuOpen,
      }}
    >
      {accountRow}
    </Tooltip>
  );
}
