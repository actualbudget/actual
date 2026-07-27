import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import {
  SvgAdd,
  SvgCreditCard,
  SvgPiggyBank,
} from '@actual-app/components/icons/v1';
import { Menu } from '@actual-app/components/menu';
import { Popover } from '@actual-app/components/popover';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import type { AccountEntity } from '@actual-app/core/types/models';

import { isAccountFailedSync } from '#accounts/syncStatus';
import { DropHighlight, useDraggable, useDroppable } from '#components/sort';
import { useAccounts } from '#hooks/useAccounts';
import { useDragRef } from '#hooks/useDragRef';
import { useLocalPref } from '#hooks/useLocalPref';
import { useNavigate } from '#hooks/useNavigate';
import { useOffBudgetAccounts } from '#hooks/useOffBudgetAccounts';
import { useOnBudgetAccounts } from '#hooks/useOnBudgetAccounts';
import { useSelector } from '#redux';

const RAIL_PIN_TYPE = 'sidebar-rail-pin';

type ConnectionStatus = 'failed' | 'pending' | 'positive' | null;

function worstConnectionStatus(
  accounts: AccountEntity[],
  syncingIds: string[],
): ConnectionStatus {
  const connected = accounts.filter(a => !!a.bank);
  if (connected.length === 0) {
    return null;
  }
  if (connected.some(a => isAccountFailedSync(a))) {
    return 'failed';
  }
  if (connected.some(a => syncingIds.includes(a.id))) {
    return 'pending';
  }
  return 'positive';
}

function StatusDot({ status }: { status: ConnectionStatus }) {
  if (!status) {
    return null;
  }
  const backgroundColor =
    status === 'failed'
      ? theme.sidebarItemBackgroundFailed
      : status === 'pending'
        ? theme.sidebarItemBackgroundPending
        : theme.sidebarItemBackgroundPositive;
  return (
    <span
      style={{
        position: 'absolute',
        right: 4,
        top: 4,
        width: 7,
        height: 7,
        borderRadius: 999,
        backgroundColor,
        border: `1.5px solid ${theme.sidebarBackground}`,
      }}
    />
  );
}

function GroupFlyoutButton({
  Icon,
  label,
  accounts,
  syncingIds,
}: {
  Icon: typeof SvgCreditCard;
  label: string;
  accounts: AccountEntity[];
  syncingIds: string[];
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const status = worstConnectionStatus(accounts, syncingIds);

  return (
    <View style={{ position: 'relative' }}>
      <Button
        ref={buttonRef}
        variant="bare"
        aria-label={label}
        onPress={() => setIsOpen(open => !open)}
        style={{
          width: 44,
          height: 36,
          borderRadius: 6,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: theme.pageTextSubdued,
        }}
      >
        <Icon width={18} height={18} />
      </Button>
      <StatusDot status={status} />
      <Popover
        placement="right top"
        offset={6}
        triggerRef={buttonRef}
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        style={{ minWidth: 200 }}
      >
        <Menu
          items={
            accounts.length > 0
              ? accounts.map(a => ({ name: a.id, text: a.name }))
              : [{ name: 'none', text: t('No accounts'), disabled: true }]
          }
          onMenuSelect={id => {
            setIsOpen(false);
            void navigate(`/accounts/${id}`);
          }}
        />
      </Popover>
    </View>
  );
}

function PinnedAccountIcon({
  account,
  syncing,
  onReorder,
}: {
  account: AccountEntity;
  syncing: boolean;
  onReorder: (
    id: string,
    dropPos: 'top' | 'bottom' | null,
    targetId: string,
  ) => void;
}) {
  const navigate = useNavigate();
  const status: ConnectionStatus = !account.bank
    ? null
    : isAccountFailedSync(account)
      ? 'failed'
      : syncing
        ? 'pending'
        : 'positive';

  const { dragRef } = useDraggable({
    type: RAIL_PIN_TYPE,
    item: { id: account.id },
    canDrag: true,
    // No drag-state UI to update here (unlike the full account list, the
    // rail pin list is short enough not to need a "dragging" style hook).
    onDragChange: () => undefined,
  });
  const handleDragRef = useDragRef(dragRef);
  const { dropRef, dropPos } = useDroppable({
    types: [RAIL_PIN_TYPE],
    id: account.id,
    onDrop: onReorder,
  });

  return (
    <View innerRef={dropRef} style={{ position: 'relative' }}>
      <DropHighlight pos={dropPos} />
      <View innerRef={handleDragRef}>
        <Button
          variant="bare"
          aria-label={account.name}
          onPress={() => void navigate(`/accounts/${account.id}`)}
          style={{
            width: 44,
            height: 36,
            borderRadius: 6,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: theme.pageTextSubdued,
            fontSize: 12,
            fontWeight: 600,
            textTransform: 'uppercase',
          }}
        >
          {account.name.slice(0, 2)}
        </Button>
        <StatusDot status={status} />
      </View>
    </View>
  );
}

function PinPicker({ candidates }: { candidates: AccountEntity[] }) {
  const { t } = useTranslation();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [pinnedAccountIds, setPinnedAccountIdsPref] = useLocalPref(
    'sidebar.pinnedAccountIds',
  );

  return (
    <View style={{ position: 'relative' }}>
      <Button
        ref={buttonRef}
        variant="bare"
        aria-label={t('Pin an account to the rail')}
        onPress={() => setIsOpen(open => !open)}
        style={{
          width: 44,
          height: 36,
          borderRadius: 6,
          border: `1px dashed ${theme.sidebarItemBackgroundHover}`,
          boxSizing: 'border-box',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: theme.pageTextSubdued,
        }}
      >
        <SvgAdd width={14} height={14} />
      </Button>
      <Popover
        placement="right top"
        offset={6}
        triggerRef={buttonRef}
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        style={{ minWidth: 200 }}
      >
        <Menu
          items={
            candidates.length > 0
              ? candidates.map(a => ({ name: a.id, text: a.name }))
              : [
                  {
                    name: 'none',
                    text: t('All accounts are pinned'),
                    disabled: true,
                  },
                ]
          }
          onMenuSelect={id => {
            setIsOpen(false);
            setPinnedAccountIdsPref([...(pinnedAccountIds ?? []), String(id)]);
          }}
        />
      </Popover>
    </View>
  );
}

export function RailAccounts() {
  const { t } = useTranslation();
  const { data: accounts = [] } = useAccounts();
  const { data: onBudgetAccounts = [] } = useOnBudgetAccounts();
  const { data: offBudgetAccounts = [] } = useOffBudgetAccounts();
  const syncingAccountIds = useSelector(state => state.account.accountsSyncing);
  const [pinnedAccountIds, setPinnedAccountIdsPref] = useLocalPref(
    'sidebar.pinnedAccountIds',
  );

  const pinnedIds = pinnedAccountIds ?? [];
  const pinnedAccounts = pinnedIds
    .map(id => accounts.find(a => a.id === id))
    .filter((a): a is AccountEntity => !!a && !a.closed);
  const unpinnedActiveAccounts = accounts.filter(
    a => !a.closed && !pinnedIds.includes(a.id),
  );

  const onReorderPins = (
    id: string,
    dropPos: 'top' | 'bottom' | null,
    targetId: string,
  ) => {
    const withoutId = pinnedIds.filter(pinId => pinId !== id);
    let targetIndex = withoutId.indexOf(targetId);
    if (dropPos === 'bottom') {
      targetIndex += 1;
    }
    const next = [...withoutId];
    next.splice(targetIndex, 0, id);
    setPinnedAccountIdsPref(next);
  };

  return (
    <View
      style={{
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
        padding: '0 12px',
      }}
    >
      {pinnedAccounts.map(account => (
        <PinnedAccountIcon
          key={account.id}
          account={account}
          syncing={syncingAccountIds.includes(account.id)}
          onReorder={onReorderPins}
        />
      ))}

      <PinPicker candidates={unpinnedActiveAccounts} />

      <View
        style={{
          height: 1,
          width: 36,
          margin: '6px 0',
          backgroundColor: theme.sidebarItemBackgroundHover,
        }}
      />

      <GroupFlyoutButton
        Icon={SvgCreditCard}
        label={t('On budget accounts')}
        accounts={onBudgetAccounts}
        syncingIds={syncingAccountIds}
      />
      <GroupFlyoutButton
        Icon={SvgPiggyBank}
        label={t('Off budget accounts')}
        accounts={offBudgetAccounts}
        syncingIds={syncingAccountIds}
      />
    </View>
  );
}
