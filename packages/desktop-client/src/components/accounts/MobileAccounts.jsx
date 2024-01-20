import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';

import {
  DndContext,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  restrictToParentElement,
  restrictToVerticalAxis,
} from '@dnd-kit/modifiers';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import * as queries from 'loot-core/src/client/queries';
import { send } from 'loot-core/src/platform/client/fetch';

import { useActions } from '../../hooks/useActions';
import { useCategories } from '../../hooks/useCategories';
import { useNavigate } from '../../hooks/useNavigate';
import { useSetThemeColor } from '../../hooks/useSetThemeColor';
import { SvgAdd } from '../../icons/v1';
import { theme, styles } from '../../style';
import { Button } from '../common/Button';
import { Text } from '../common/Text';
import { TextOneLine } from '../common/TextOneLine';
import { View } from '../common/View';
import { Page } from '../Page';
import { PullToRefresh } from '../responsive/PullToRefresh';
import { CellValue } from '../spreadsheet/CellValue';
import { findSortDown, getDropPosition } from '../util/sort';

function AccountHeader({ name, amount, style = {} }) {
  return (
    <View
      style={{
        flex: 1,
        flexDirection: 'row',
        marginTop: 10,
        marginRight: 10,
        color: theme.pageTextLight,
        width: '100%',
        ...style,
      }}
    >
      <View style={{ flex: 1 }}>
        <Text
          style={{
            ...styles.text,
            textTransform: 'uppercase',
            fontSize: 13,
          }}
          data-testid="name"
        >
          {name}
        </Text>
      </View>
      <CellValue
        binding={amount}
        style={{ ...styles.text, fontSize: 13 }}
        type="financial"
      />
    </View>
  );
}

function AccountCard({ account, updated, getBalanceQuery, onSelect }) {
  const {
    isDragging,
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: account.id });

  const dndStyle = {
    opacity: isDragging ? 0.5 : undefined,
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <View
      innerRef={setNodeRef}
      {...attributes}
      {...listeners}
      style={{
        flex: 1,
        flexDirection: 'row',
        backgroundColor: theme.tableBackground,
        boxShadow: `0 1px 1px ${theme.mobileAccountShadow}`,
        borderRadius: 6,
        marginTop: 10,
        marginRight: 10,
        width: '100%',
        ...dndStyle,
      }}
      data-testid="account"
    >
      <Button
        onClick={() => onSelect(account.id)}
        style={{
          flexDirection: 'row',
          border: '1px solid ' + theme.pillBorder,
          flex: 1,
          alignItems: 'center',
          borderRadius: 6,
        }}
      >
        <View
          style={{
            flex: 1,
            margin: '10px 0',
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
            }}
          >
            <TextOneLine
              style={{
                ...styles.text,
                fontSize: 17,
                fontWeight: 600,
                color: updated ? theme.mobileAccountText : theme.pillText,
                paddingRight: 30,
              }}
              data-testid="account-name"
            >
              {account.name}
            </TextOneLine>
            {account.bankId && (
              <View
                style={{
                  backgroundColor: theme.noticeBackgroundDark,
                  marginLeft: '-23px',
                  width: 8,
                  height: 8,
                  borderRadius: 8,
                }}
              />
            )}
          </View>
        </View>
        <CellValue
          binding={getBalanceQuery(account)}
          type="financial"
          style={{ fontSize: 16, color: 'inherit' }}
          getStyle={value => value < 0 && { color: 'inherit' }}
          data-testid="account-balance"
        />
      </Button>
    </View>
  );
}

function EmptyMessage() {
  return (
    <View style={{ flex: 1, padding: 30 }}>
      <Text style={styles.text}>
        For Actual to be useful, you need to add an account. You can link an
        account to automatically download transactions, or manage it locally
        yourself.
      </Text>
    </View>
  );
}

function AccountList({
  accounts,
  updatedAccounts,
  getBalanceQuery,
  getOnBudgetBalance,
  getOffBudgetBalance,
  onAddAccount,
  onSelectAccount,
  onSync,
  onReorder,
}) {
  const budgetedAccounts = accounts.filter(account => account.offbudget === 0);
  const offbudgetAccounts = accounts.filter(account => account.offbudget === 1);
  const noBackgroundColorStyle = {
    backgroundColor: 'transparent',
    color: 'white',
  };

  const sensors = useSensors(
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    }),
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 10,
      },
    }),
  );

  const [isDragging, setIsDragging] = useState(false);

  const onDragStart = e => {
    setIsDragging(true);
  };

  const onDragEnd = e => {
    const { active, over } = e;

    if (active.id !== over.id) {
      const dropPos = getDropPosition(
        active.rect.current.translated,
        active.rect.current.initial,
      );

      onReorder(active.id, dropPos, over.id);
    }

    setIsDragging(false);
  };

  return (
    <Page
      title="Accounts"
      headerRightContent={
        <Button
          type="bare"
          style={{
            ...noBackgroundColorStyle,
            margin: 10,
          }}
          activeStyle={noBackgroundColorStyle}
          hoveredStyle={noBackgroundColorStyle}
          onClick={onAddAccount}
        >
          <SvgAdd width={20} height={20} />
        </Button>
      }
      padding={0}
      style={{ flex: 1, backgroundColor: theme.mobilePageBackground }}
    >
      {accounts.length === 0 && <EmptyMessage />}
      <PullToRefresh isPullable={!isDragging} onRefresh={onSync}>
        <View style={{ margin: 10 }}>
          {budgetedAccounts.length > 0 && (
            <AccountHeader name="For Budget" amount={getOnBudgetBalance()} />
          )}
          <View>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              modifiers={[restrictToVerticalAxis, restrictToParentElement]}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
            >
              <SortableContext
                items={budgetedAccounts}
                strategy={verticalListSortingStrategy}
              >
                {budgetedAccounts.map(acct => (
                  <AccountCard
                    account={acct}
                    key={acct.id}
                    updated={updatedAccounts.includes(acct.id)}
                    getBalanceQuery={getBalanceQuery}
                    onSelect={onSelectAccount}
                  />
                ))}
              </SortableContext>
            </DndContext>
          </View>

          {offbudgetAccounts.length > 0 && (
            <AccountHeader
              name="Off budget"
              amount={getOffBudgetBalance()}
              style={{ marginTop: 30 }}
            />
          )}
          <View>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              modifiers={[restrictToVerticalAxis, restrictToParentElement]}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
            >
              <SortableContext
                items={offbudgetAccounts}
                strategy={verticalListSortingStrategy}
              >
                {offbudgetAccounts.map(acct => (
                  <AccountCard
                    account={acct}
                    key={acct.id}
                    updated={updatedAccounts.includes(acct.id)}
                    getBalanceQuery={getBalanceQuery}
                    onSelect={onSelectAccount}
                  />
                ))}
              </SortableContext>
            </DndContext>
          </View>
        </View>
      </PullToRefresh>
    </Page>
  );
}

export function Accounts() {
  const accounts = useSelector(state => state.queries.accounts);
  const newTransactions = useSelector(state => state.queries.newTransactions);
  const updatedAccounts = useSelector(state => state.queries.updatedAccounts);
  const numberFormat = useSelector(
    state => state.prefs.local.numberFormat || 'comma-dot',
  );
  const hideFraction = useSelector(
    state => state.prefs.local.hideFraction || false,
  );

  const { list: categories } = useCategories();
  const { getAccounts, replaceModal, syncAndDownload } = useActions();

  const transactions = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    (async () => getAccounts())();
  }, []);

  const onSelectAccount = id => {
    navigate(`/accounts/${id}`);
  };

  const onSelectTransaction = transaction => {
    navigate(`/transaction/${transaction}`);
  };

  const onReorder = async (id, dropPos, targetId) => {
    await send('account-move', {
      id,
      ...findSortDown(accounts, dropPos, targetId),
    });
    await getAccounts();
  };

  useSetThemeColor(theme.mobileViewTheme);

  return (
    <View style={{ flex: 1 }}>
      <AccountList
        // This key forces the whole table rerender when the number
        // format changes
        key={numberFormat + hideFraction}
        accounts={accounts.filter(account => !account.closed)}
        categories={categories}
        transactions={transactions || []}
        updatedAccounts={updatedAccounts}
        newTransactions={newTransactions}
        getBalanceQuery={queries.accountBalance}
        getOnBudgetBalance={queries.budgetedAccountBalance}
        getOffBudgetBalance={queries.offbudgetAccountBalance}
        onAddAccount={() => replaceModal('add-account')}
        onSelectAccount={onSelectAccount}
        onSelectTransaction={onSelectTransaction}
        onSync={syncAndDownload}
        onReorder={onReorder}
      />
    </View>
  );
}
