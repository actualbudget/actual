import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { RectButton } from 'react-native-gesture-handler';
import { useDispatch } from 'react-redux';
import { useLocation, useHistory } from 'react-router';
import { withRouter } from 'react-router-dom';

import { css } from 'glamor';

import { closeBudget } from 'loot-core/src/client/actions/budgets';
import Platform from 'loot-core/src/client/platform';
import PiggyBank from 'loot-design/src/svg/v1/PiggyBank';

import { styles, colors } from '../style';
import Add from '../svg/v1/Add';
import CheveronDown from '../svg/v1/CheveronDown';
import CheveronUp from '../svg/v1/CheveronUp';
import Cog from '../svg/v1/Cog';
import DotsHorizontalTriple from '../svg/v1/DotsHorizontalTriple';
import LoadBalancer from '../svg/v1/LoadBalancer';
import Reports from '../svg/v1/Reports';
import StoreFrontIcon from '../svg/v1/StoreFront';
import TuningIcon from '../svg/v1/Tuning';
import Wallet from '../svg/v1/Wallet';
import Wrench from '../svg/v1/Wrench';
import ArrowButtonLeft1 from '../svg/v2/ArrowButtonLeft1';
import CalendarIcon from '../svg/v2/Calendar';
import {
  View,
  Block,
  AlignedText,
  AnchorLink,
  ButtonLink,
  Button,
  Menu,
  Tooltip
} from './common';
import { useDraggable, useDroppable, DropHighlight } from './sort.js';
import CellValue from './spreadsheet/CellValue';

export const SIDEBAR_WIDTH = 240;

function Item({
  children,
  Icon,
  title,
  style,
  indent = 0,
  to,
  exact,
  onClick,
  button,
  forceHover = false,
  forceActive = false
}) {
  const hoverStyle = {
    backgroundColor: colors.n2
  };
  const activeStyle = {
    borderLeft: '4px solid ' + colors.p8,
    paddingLeft: 19 + indent - 4,
    color: colors.p8
  };
  const linkStyle = [
    {
      ...styles.mediumText,
      paddingTop: 9,
      paddingBottom: 9,
      paddingLeft: 19 + indent,
      paddingRight: 10,
      textDecoration: 'none',
      color: colors.n9,
      ...(forceHover ? hoverStyle : {}),
      ...(forceActive ? activeStyle : {})
    },
    { ':hover': hoverStyle }
  ];

  const content = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        height: 20
      }}
    >
      <Icon width={15} height={15} style={{ color: 'inherit' }} />
      <Block style={{ marginLeft: 8 }}>{title}</Block>
      <View style={{ flex: 1 }} />
      {button}
    </View>
  );

  return (
    <View style={[{ flexShrink: 0 }, style]}>
      {onClick ? (
        <RectButton onClick={onClick}>
          <View style={linkStyle}>{content}</View>
        </RectButton>
      ) : (
        <AnchorLink
          style={linkStyle}
          to={to}
          exact={exact}
          activeStyle={activeStyle}
        >
          {content}
        </AnchorLink>
      )}

      {children ? <View style={{ marginTop: 5 }}>{children}</View> : null}
    </View>
  );
}

let accountNameStyle = [
  {
    marginTop: -2,
    marginBottom: 2,
    paddingTop: 4,
    paddingBottom: 4,
    paddingRight: 15,
    paddingLeft: 10,
    textDecoration: 'none',
    color: colors.n9
  },
  { ':hover': { backgroundColor: colors.n2 } },
  styles.smallText
];

function Account({
  name,
  account,
  connected,
  failed,
  updated,
  to,
  query,
  style,
  outerStyle,
  onDragChange,
  onDrop
}) {
  let type = account
    ? account.closed
      ? 'account-closed'
      : account.offbudget
      ? 'account-offbudget'
      : 'account-onbudget'
    : 'title';

  let { dragRef } = useDraggable({
    type,
    onDragChange,
    item: { id: account && account.id },
    canDrag: account != null
  });

  let { dropRef, dropPos } = useDroppable({
    types: account ? [type] : [],
    id: account && account.id,
    onDrop: onDrop
  });

  return (
    <View innerRef={dropRef} style={[{ flexShrink: 0 }, outerStyle]}>
      <View>
        <DropHighlight pos={dropPos} />
        <View innerRef={dragRef}>
          <AnchorLink
            ref={dragRef}
            to={to}
            style={[
              accountNameStyle,
              style,
              { position: 'relative', borderLeft: '4px solid transparent' },
              updated && { fontWeight: 700 }
            ]}
            activeStyle={{
              borderColor: colors.p8,
              color: colors.p8,
              // This is kind of a hack, but we don't ever want the account
              // that the user is looking at to be "bolded" which means it
              // has unread transactions. The system does mark is read and
              // unbolds it, but it still "flashes" bold so this just
              // ignores it if it's active
              fontWeight: 'normal',
              '& .dot': {
                backgroundColor: colors.p8,
                transform: 'translateX(-4.5px)'
              }
            }}
          >
            <View
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                flexDirection: 'row',
                alignItems: 'center'
              }}
            >
              <div
                className="dot"
                {...css({
                  marginRight: 3,
                  width: 5,
                  height: 5,
                  borderRadius: 5,
                  backgroundColor: failed ? colors.r7 : colors.g5,
                  marginLeft: 2,
                  transition: 'transform .3s',
                  opacity: connected ? 1 : 0
                })}
              />
            </View>

            <AlignedText
              left={name}
              right={
                <CellValue debug={true} binding={query} type="financial" />
              }
            />
          </AnchorLink>
        </View>
      </View>
    </View>
  );
}

function Accounts({
  accounts,
  failedAccounts,
  updatedAccounts,
  getAccountPath,
  allAccountsPath,
  budgetedAccountPath,
  offBudgetAccountPath,
  getBalanceQuery,
  getAllAccountBalance,
  getOnBudgetBalance,
  getOffBudgetBalance,
  showClosedAccounts,
  onAddAccount,
  onToggleClosedAccounts,
  onReorder
}) {
  let [isDragging, setIsDragging] = useState(false);
  let offbudgetAccounts = useMemo(
    () =>
      accounts.filter(
        account => account.closed === 0 && account.offbudget === 1
      ),
    [accounts]
  );
  let budgetedAccounts = useMemo(
    () =>
      accounts.filter(
        account => account.closed === 0 && account.offbudget === 0
      ),
    [accounts]
  );
  let closedAccounts = useMemo(
    () => accounts.filter(account => account.closed === 1),
    [accounts]
  );

  function onDragChange(drag) {
    setIsDragging(drag.state === 'start');
  }

  let makeDropPadding = (i, length) => {
    if (i === 0) {
      return {
        paddingTop: isDragging ? 15 : 0,
        marginTop: isDragging ? -15 : 0
      };
    } else if (i === length - 1) {
      return {
        paddingBottom: 15
      };
    }
    return null;
  };

  return (
    <View>
      {accounts.length > 0 && (
        <Account
          name="All Accounts"
          to={allAccountsPath}
          query={getAllAccountBalance()}
          style={{ marginTop: 8, color: colors.n6 }}
        />
      )}

      {budgetedAccounts.length > 0 && (
        <Account
          name="For budget"
          to={budgetedAccountPath}
          query={getOnBudgetBalance()}
          style={{ marginTop: 15, color: colors.n6 }}
        />
      )}

      {budgetedAccounts.map((account, i) => (
        <Account
          key={account.id}
          name={account.name}
          account={account}
          connected={!!account.bankId}
          failed={failedAccounts && failedAccounts.has(account.id)}
          updated={updatedAccounts && updatedAccounts.includes(account.id)}
          to={getAccountPath(account)}
          query={getBalanceQuery(account)}
          onDragChange={onDragChange}
          onDrop={onReorder}
          outerStyle={makeDropPadding(i, budgetedAccounts.length)}
        />
      ))}

      {offbudgetAccounts.length > 0 && (
        <Account
          name="Off budget"
          to={offBudgetAccountPath}
          query={getOffBudgetBalance()}
          style={{ color: colors.n6 }}
        />
      )}

      {offbudgetAccounts.map((account, i) => (
        <Account
          key={account.id}
          name={account.name}
          account={account}
          connected={!!account.bankId}
          failed={failedAccounts && failedAccounts.has(account.id)}
          updated={updatedAccounts && updatedAccounts.includes(account.id)}
          to={getAccountPath(account)}
          query={getBalanceQuery(account)}
          onDragChange={onDragChange}
          onDrop={onReorder}
          outerStyle={makeDropPadding(i, offbudgetAccounts.length)}
        />
      ))}

      {closedAccounts.length > 0 && (
        <View
          style={[
            accountNameStyle,
            {
              marginTop: 15,
              color: colors.n6,
              flexDirection: 'row',
              userSelect: 'none',
              alignItems: 'center',
              flexShrink: 0,
              cursor: 'pointer'
            }
          ]}
          onClick={onToggleClosedAccounts}
        >
          {'Closed Accounts' + (showClosedAccounts ? '' : '...')}
        </View>
      )}

      {showClosedAccounts &&
        closedAccounts.map((account, i) => (
          <Account
            key={account.id}
            name={account.name}
            account={account}
            to={getAccountPath(account)}
            query={getBalanceQuery(account)}
            onDragChange={onDragChange}
            onDrop={onReorder}
          />
        ))}

      <View
        style={[
          accountNameStyle,
          {
            marginTop: 15,
            color: colors.n6,
            flexDirection: 'row',
            userSelect: 'none',
            alignItems: 'center',
            flexShrink: 0,
            cursor: 'pointer'
          }
        ]}
        onClick={onAddAccount}
      >
        <Add style={{ width: 13, height: 13, color: colors.n6 }} />
        <View style={{ marginLeft: 5 }}>Add account</View>
      </View>
    </View>
  );
}

function ToggleButton({ style, onFloat }) {
  return (
    <View className="float" style={[style, { flexShrink: 0 }]}>
      <Button bare onClick={onFloat}>
        <ArrowButtonLeft1 style={{ width: 13, height: 13, color: colors.n5 }} />
      </Button>
    </View>
  );
}

const MenuButton = withRouter(function MenuButton({ history }) {
  let dispatch = useDispatch();
  let [menuOpen, setMenuOpen] = useState(false);

  function onMenuSelect(type) {
    setMenuOpen(false);

    switch (type) {
      case 'settings':
        history.push('/settings');
        break;
      case 'help':
        window.open('https://actualbudget.github.io/docs', '_blank');
        break;
      case 'close':
        dispatch(closeBudget());
        break;
      default:
    }
  }

  let items = [
    { name: 'settings', text: 'Settings' },
    { name: 'help', text: 'Help' },
    { name: 'close', text: 'Close File' }
  ];

  return (
    <Button
      bare
      style={{
        color: colors.n5,
        flexShrink: 0
      }}
      activeStyle={{ color: colors.p7 }}
      onClick={() => setMenuOpen(true)}
    >
      <DotsHorizontalTriple
        width={15}
        height={15}
        style={{ color: 'inherit', transform: 'rotateZ(0deg)' }}
      />
      {menuOpen && (
        <Tooltip
          position="bottom-right"
          style={{ padding: 0 }}
          onClose={() => setMenuOpen(false)}
        >
          <Menu onMenuSelect={onMenuSelect} items={items} />
        </Tooltip>
      )}
    </Button>
  );
});

function ToggleableSection({
  title,
  Icon,
  children,
  isOpen,
  setOpen,
  isActive
}) {
  let ExpandOrCollapseIcon = isOpen ? CheveronUp : CheveronDown;
  let onToggle = useCallback(() => setOpen(open => !open), []);
  return (
    <View style={{ flexShrink: 0, marginTop: 15 }}>
      <Item
        title={title}
        Icon={Icon}
        onClick={onToggle}
        button={
          <ExpandOrCollapseIcon
            width={12}
            height={12}
            style={{ color: colors.n6 }}
          />
        }
        forceActive={!isOpen && isActive}
      />
      {isOpen && children}
    </View>
  );
}

function Tools() {
  let [isOpen, setOpen] = useState(false);
  let location = useLocation();
  let history = useHistory();

  const isActive = ['/payees', '/rules', '/tools'].some(route =>
    location.pathname.startsWith(route)
  );

  useEffect(() => {
    if (isActive) {
      setOpen(true);
    }
  }, [location.pathname]);

  return (
    <ToggleableSection
      title="Tools"
      Icon={Wrench}
      isOpen={isOpen}
      setOpen={setOpen}
      isActive={isActive}
    >
      <Item title="Payees" Icon={StoreFrontIcon} to="/payees" />
      <Item title="Rules" Icon={TuningIcon} to="/rules" />
      <Item title="Repair splits" Icon={LoadBalancer} to="/tools/fix-splits" />
    </ToggleableSection>
  );
}

export function AccountsSection({
  accounts,
  failedAccounts,
  updatedAccounts,
  getBalanceQuery,
  getAllAccountBalance,
  getOnBudgetBalance,
  getOffBudgetBalance,
  showClosedAccounts,
  onAddAccount,
  onToggleClosedAccounts,
  onReorder
}) {
  let [isOpen, setOpen] = useState(true);
  let location = useLocation();

  return (
    <ToggleableSection
      title="Accounts"
      Icon={PiggyBank}
      isOpen={isOpen}
      setOpen={setOpen}
      style={{ marginTop: 15 }}
      isActive={location.pathname.startsWith('/accounts')}
    >
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
    </ToggleableSection>
  );
}

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
  onReorder
}) {
  let hasWindowButtons = !Platform.isBrowser && Platform.OS === 'mac';

  return (
    <View
      style={[
        {
          width: SIDEBAR_WIDTH,
          color: colors.n9,
          backgroundColor: colors.n1,
          '& .float': {
            opacity: 0,
            transition: 'opacity .25s, width .25s',
            width: hasWindowButtons ? null : 0
          },
          '&:hover .float': {
            opacity: 1,
            width: hasWindowButtons ? null : 'auto'
          }
        },
        style
      ]}
    >
      {hasWindowButtons && (
        <ToggleButton
          style={[
            {
              height: isFloating ? 0 : 36,
              alignItems: 'flex-end',
              justifyContent: 'center',
              overflow: 'hidden',
              WebkitAppRegion: 'drag',
              paddingRight: 8
            }
          ]}
          onFloat={onFloat}
        />
      )}
      <View
        style={[
          {
            paddingTop: 35,
            height: 30,
            flexDirection: 'row',
            alignItems: 'center',
            margin: '0 8px 23px 20px',
            transition: 'padding .4s'
          },
          hasWindowButtons && {
            paddingTop: 20,
            justifyContent: 'flex-start'
          }
        ]}
      >
        {budgetName}

        {!Platform.isBrowser && (
          <ButtonLink
            bare
            to="/settings"
            style={{
              // Needed for Windows? No idea why this is displayed as block
              display: 'inherit',
              color: colors.n5,
              marginLeft: hasWindowButtons ? 0 : 5,
              flexShrink: 0
            }}
            activeStyle={{ color: colors.p7 }}
          >
            <Cog width={15} height={15} style={{ color: 'inherit' }} />
          </ButtonLink>
        )}

        <View style={{ flex: 1, flexDirection: 'row' }} />

        {!hasWindowButtons && <ToggleButton onFloat={onFloat} />}
        {Platform.isBrowser && <MenuButton />}
      </View>

      <View style={{ overflow: 'auto' }}>
        <Item title="Budget" Icon={Wallet} to="/budget" />
        <Item title="Reports" Icon={Reports} to="/reports" />

        <Item title="Schedules" Icon={CalendarIcon} to="/schedules" />

        <Tools />

        <AccountsSection
          accounts={accounts}
          failedAccounts={failedAccounts}
          updatedAccounts={updatedAccounts}
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
