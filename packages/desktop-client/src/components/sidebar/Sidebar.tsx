import React, { type ReactNode } from 'react';

import * as Platform from 'loot-core/src/client/platform';
import { type AccountEntity } from 'loot-core/src/types/models';

import { SvgReports, SvgWallet } from '../../icons/v1';
import { SvgCalendar } from '../../icons/v2';
import { type CSSProperties, theme } from '../../style';
import { View } from '../common/View';
import { type Binding } from '../spreadsheet';

import { Accounts } from './Accounts';
import { Item } from './Item';
import { ToggleButton } from './ToggleButton';
import { Tools } from './Tools';

import { useSidebar } from '.';

export const SIDEBAR_WIDTH = 240;

type SidebarProps = {
  style: CSSProperties;
  budgetName: ReactNode;
  accounts: AccountEntity[];
  failedAccounts: Map<
    string,
    {
      type: string;
      code: string;
    }
  >;
  updatedAccounts: string[];
  getBalanceQuery: (account: AccountEntity) => Binding;
  getAllAccountBalance: () => Binding;
  getOnBudgetBalance: () => Binding;
  getOffBudgetBalance: () => Binding;
  showClosedAccounts: boolean;
  isFloating: boolean;
  onFloat: () => void;
  onAddAccount: () => void;
  onToggleClosedAccounts: () => void;
  onReorder: (id: string, dropPos: 'top' | 'bottom', targetId: string) => void;
};

export function Sidebar({
  style,
  budgetName,
  accounts,
  failedAccounts,
  updatedAccounts,
  getBalanceQuery,
  getAllAccountBalance,
  getOnBudgetBalance,
  getOffBudgetBalance,
  showClosedAccounts,
  isFloating,
  onFloat,
  onAddAccount,
  onToggleClosedAccounts,
  onReorder,
}: SidebarProps) {
  const hasWindowButtons = !Platform.isBrowser && Platform.OS === 'mac';

  const sidebar = useSidebar();

  return (
    <View
      style={{
        width: SIDEBAR_WIDTH,
        color: theme.sidebarItemText,
        backgroundColor: theme.sidebarBackground,
        '& .float': {
          opacity: isFloating ? 1 : 0,
          transition: 'opacity .25s, width .25s',
          width: hasWindowButtons || isFloating ? null : 0,
        },
        '&:hover .float': {
          opacity: 1,
          width: hasWindowButtons ? null : 'auto',
        },
        ...style,
      }}
    >
      <View
        style={{
          paddingTop: 35,
          height: 30,
          flexDirection: 'row',
          alignItems: 'center',
          margin: '0 8px 23px 20px',
          transition: 'padding .4s',
          ...(hasWindowButtons && {
            paddingTop: 20,
            justifyContent: 'flex-start',
          }),
        }}
      >
        {budgetName}

        <View style={{ flex: 1, flexDirection: 'row' }} />

        {!sidebar.alwaysFloats && (
          <ToggleButton isFloating={isFloating} onFloat={onFloat} />
        )}
      </View>

      <View style={{ overflow: 'auto' }}>
        <Item title="Budget" Icon={SvgWallet} to="/budget" />
        <Item title="Reports" Icon={SvgReports} to="/reports" />

        <Item title="Schedules" Icon={SvgCalendar} to="/schedules" />

        <Tools />

        <View
          style={{
            height: 1,
            backgroundColor: theme.sidebarItemBackgroundHover,
            marginTop: 15,
            flexShrink: 0,
          }}
        />

        <Accounts
          accounts={accounts}
          failedAccounts={failedAccounts}
          updatedAccounts={updatedAccounts}
          getAccountPath={account => `/accounts/${account.id}`}
          allAccountsPath="/accounts"
          budgetedAccountPath="/accounts/budgeted"
          offBudgetAccountPath="/accounts/offbudget"
          getBalanceQuery={getBalanceQuery}
          getAllAccountBalance={getAllAccountBalance}
          getOnBudgetBalance={getOnBudgetBalance}
          getOffBudgetBalance={getOffBudgetBalance}
          showClosedAccounts={showClosedAccounts}
          onAddAccount={onAddAccount}
          onToggleClosedAccounts={onToggleClosedAccounts}
          onReorder={onReorder}
        />
      </View>
    </View>
  );
}
