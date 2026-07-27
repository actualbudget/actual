import React, { useState } from 'react';
import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { SvgCheveronDown } from '@actual-app/components/icons/v1';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import type { AccountEntity } from '@actual-app/core/types/models';

import { useMoveAccountMutation } from '#accounts';
import { isAccountFailedSync } from '#accounts/syncStatus';
import { useAccounts } from '#hooks/useAccounts';
import { useClosedAccounts } from '#hooks/useClosedAccounts';
import { useLocalPref } from '#hooks/useLocalPref';
import { useOffBudgetAccounts } from '#hooks/useOffBudgetAccounts';
import { useOnBudgetAccounts } from '#hooks/useOnBudgetAccounts';
import { useUpdatedAccounts } from '#hooks/useUpdatedAccounts';
import { useSelector } from '#redux';
import type { Binding, SheetFields } from '#spreadsheet';
import * as bindings from '#spreadsheet/bindings';

import { Account } from './Account';
import { AccountsSyncStatus } from './AccountsSyncStatus';
import { SecondaryItem } from './SecondaryItem';
import type { WidthMode } from './widthMode';

const fontWeight = 600;

type GroupHeaderProps<FieldName extends SheetFields<'account'>> = {
  name: string;
  to: string;
  query: Binding<'account', FieldName>;
  balanceTestId: string;
  collapsed: boolean;
  onToggleCollapse: () => void;
  collapseLabel: string;
  style?: CSSProperties;
  widthMode: Exclude<WidthMode, 'rail'>;
};

function GroupHeader<FieldName extends SheetFields<'account'>>({
  name,
  to,
  query,
  balanceTestId,
  collapsed,
  onToggleCollapse,
  collapseLabel,
  style,
  widthMode,
}: GroupHeaderProps<FieldName>) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', ...style }}>
      <Button
        variant="bare"
        aria-label={collapseLabel}
        aria-expanded={!collapsed}
        onPress={onToggleCollapse}
        style={{ padding: '2px 4px', color: theme.pageTextSubdued }}
      >
        <SvgCheveronDown
          width={9}
          height={9}
          style={{
            transform: collapsed ? 'rotate(-90deg)' : 'none',
            transition: 'transform .15s',
          }}
        />
      </Button>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Account
          name={name}
          to={to}
          query={query}
          style={{ fontWeight, marginTop: 0, marginBottom: 0 }}
          titleAccount
          balanceTestId={balanceTestId}
          widthMode={widthMode}
        />
      </View>
    </View>
  );
}

type AccountsProps = {
  widthMode: Exclude<WidthMode, 'rail'>;
};

export function Accounts({ widthMode }: AccountsProps) {
  const { t } = useTranslation();
  const [isDragging, setIsDragging] = useState(false);
  const { data: accounts = [] } = useAccounts();
  const updatedAccounts = useUpdatedAccounts();
  const { data: offbudgetAccounts = [] } = useOffBudgetAccounts();
  const { data: onBudgetAccounts = [] } = useOnBudgetAccounts();
  const { data: closedAccounts = [] } = useClosedAccounts();
  const syncingAccountIds = useSelector(state => state.account.accountsSyncing);

  const getAccountPath = (account: AccountEntity) => `/accounts/${account.id}`;

  const [showClosedAccounts, setShowClosedAccountsPref] = useLocalPref(
    'ui.showClosedAccounts',
  );
  const [onBudgetCollapsed, setOnBudgetCollapsedPref] = useLocalPref(
    'ui.sidebarOnBudgetCollapsed',
  );
  const [offBudgetCollapsed, setOffBudgetCollapsedPref] = useLocalPref(
    'ui.sidebarOffBudgetCollapsed',
  );

  function onDragChange(drag: { state: string }) {
    setIsDragging(drag.state === 'start');
  }

  const moveAccount = useMoveAccountMutation();

  const makeDropPadding = (i: number) => {
    if (i === 0) {
      return {
        paddingTop: isDragging ? 15 : 0,
        marginTop: isDragging ? -15 : 0,
      };
    }
    return undefined;
  };

  async function onReorder(
    id: string,
    dropPos: 'top' | 'bottom' | null,
    targetId: string,
  ) {
    let targetIdToMove: string | null = targetId;
    if (dropPos === 'bottom') {
      const idx = accounts.findIndex(a => a.id === targetId) + 1;
      targetIdToMove = idx < accounts.length ? accounts[idx].id : null;
    }

    moveAccount.mutate({ id, targetId: targetIdToMove });
  }

  const onToggleClosedAccounts = () => {
    setShowClosedAccountsPref(!showClosedAccounts);
  };

  return (
    <View
      style={{
        flexGrow: 1,
        '@media screen and (max-height: 480px)': {
          minHeight: 'auto',
        },
      }}
    >
      <View
        style={{
          height: 1,
          backgroundColor: theme.sidebarItemBackgroundHover,
          marginTop: 15,
          flexShrink: 0,
        }}
      />

      <View style={{ overflow: 'auto' }}>
        <View style={{ padding: '15px 14px 6px' }}>
          <AccountsSyncStatus showLabel={widthMode === 'full'} />
        </View>

        <Account
          name={t('All accounts')}
          to="/accounts"
          query={bindings.allAccountBalance()}
          style={{ fontWeight }}
          isExactPathMatch
          balanceTestId="sidebar-all-accounts-balance"
          widthMode={widthMode}
        />

        {onBudgetAccounts.length > 0 && (
          <GroupHeader
            name={t('On budget')}
            to="/accounts/onbudget"
            query={bindings.onBudgetAccountBalance()}
            style={{ marginTop: 13, marginBottom: 5 }}
            balanceTestId="sidebar-on-budget-balance"
            collapsed={!!onBudgetCollapsed}
            onToggleCollapse={() =>
              setOnBudgetCollapsedPref(!onBudgetCollapsed)
            }
            collapseLabel={
              onBudgetCollapsed
                ? t('Expand on budget accounts')
                : t('Collapse on budget accounts')
            }
            widthMode={widthMode}
          />
        )}

        {!onBudgetCollapsed &&
          onBudgetAccounts.map((account, i) => (
            <Account
              key={account.id}
              name={account.name}
              account={account}
              connected={!!account.bank}
              pending={syncingAccountIds.includes(account.id)}
              failed={isAccountFailedSync(account)}
              updated={updatedAccounts.includes(account.id)}
              to={getAccountPath(account)}
              query={bindings.accountBalance(account.id)}
              onDragChange={onDragChange}
              onDrop={onReorder}
              outerStyle={makeDropPadding(i)}
              widthMode={widthMode}
            />
          ))}

        {offbudgetAccounts.length > 0 && (
          <GroupHeader
            name={t('Off budget')}
            to="/accounts/offbudget"
            query={bindings.offBudgetAccountBalance()}
            style={{ marginTop: 13, marginBottom: 5 }}
            balanceTestId="sidebar-off-budget-balance"
            collapsed={!!offBudgetCollapsed}
            onToggleCollapse={() =>
              setOffBudgetCollapsedPref(!offBudgetCollapsed)
            }
            collapseLabel={
              offBudgetCollapsed
                ? t('Expand off budget accounts')
                : t('Collapse off budget accounts')
            }
            widthMode={widthMode}
          />
        )}

        {!offBudgetCollapsed &&
          offbudgetAccounts.map((account, i) => (
            <Account
              key={account.id}
              name={account.name}
              account={account}
              connected={!!account.bank}
              pending={syncingAccountIds.includes(account.id)}
              failed={isAccountFailedSync(account)}
              updated={updatedAccounts.includes(account.id)}
              to={getAccountPath(account)}
              query={bindings.accountBalance(account.id)}
              onDragChange={onDragChange}
              onDrop={onReorder}
              outerStyle={makeDropPadding(i)}
              widthMode={widthMode}
            />
          ))}

        {closedAccounts.length > 0 && (
          <SecondaryItem
            style={{ marginTop: 15 }}
            title={
              showClosedAccounts
                ? t('Closed accounts')
                : t('Closed accounts...')
            }
            onClick={onToggleClosedAccounts}
            bold
          />
        )}

        {showClosedAccounts &&
          closedAccounts.map(account => (
            <Account
              key={account.id}
              name={account.name}
              account={account}
              to={getAccountPath(account)}
              query={bindings.accountBalance(account.id)}
              onDragChange={onDragChange}
              onDrop={onReorder}
              widthMode={widthMode}
            />
          ))}
      </View>
    </View>
  );
}
