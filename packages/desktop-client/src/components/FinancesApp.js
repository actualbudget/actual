import React, { useEffect, useMemo, useState } from 'react';
import { DndProvider } from 'react-dnd';
import Backend from 'react-dnd-html5-backend';
import { connect } from 'react-redux';
import {
  Router,
  Route,
  Redirect,
  Switch,
  useLocation,
  NavLink,
} from 'react-router-dom';
import { CompatRouter } from 'react-router-dom-v5-compat';

import { createBrowserHistory } from 'history';
import hotkeys from 'hotkeys-js';

import * as actions from 'loot-core/src/client/actions';
import { AccountsProvider } from 'loot-core/src/client/data-hooks/accounts';
import { PayeesProvider } from 'loot-core/src/client/data-hooks/payees';
import { SpreadsheetProvider } from 'loot-core/src/client/SpreadsheetProvider';
import checkForUpdateNotification from 'loot-core/src/client/update-notification';
import checkForUpgradeNotifications from 'loot-core/src/client/upgrade-notifications';
import * as undo from 'loot-core/src/platform/client/undo';

import Cog from '../icons/v1/Cog';
import PiggyBank from '../icons/v1/PiggyBank';
import Wallet from '../icons/v1/Wallet';
import { useResponsive } from '../ResponsiveProvider';
import { colors, styles } from '../style';
import { getLocationState, makeLocationState } from '../util/location-state';
import { getIsOutdated, getLatestVersion } from '../util/versions';

import Account from './accounts/Account';
import MobileAccount from './accounts/MobileAccount';
import MobileAccounts from './accounts/MobileAccounts';
import { ActiveLocationProvider } from './ActiveLocation';
import BankSyncStatus from './BankSyncStatus';
import Budget from './budget';
import { BudgetMonthCountProvider } from './budget/BudgetMonthCountContext';
import MobileBudget from './budget/MobileBudget';
import { View } from './common';
import FloatableSidebar, { SidebarProvider } from './FloatableSidebar';
import GlobalKeys from './GlobalKeys';
import { ManageRulesPage } from './ManageRulesPage';
import Modals from './Modals';
import NordigenLink from './nordigen/NordigenLink';
import Notifications from './Notifications';
import { PageTypeProvider } from './Page';
import { ManagePayeesPage } from './payees/ManagePayeesPage';
import Reports from './reports';
import Schedules from './schedules';
import DiscoverSchedules from './schedules/DiscoverSchedules';
import EditSchedule from './schedules/EditSchedule';
import LinkSchedule from './schedules/LinkSchedule';
import PostsOfflineNotification from './schedules/PostsOfflineNotification';
import Settings from './settings';
import Titlebar, { TitlebarProvider } from './Titlebar';

function NarrowNotSupported({ children, redirectTo = '/budget' }) {
  const { isNarrowWidth } = useResponsive();
  return isNarrowWidth ? <Redirect to={redirectTo} /> : children;
}

function Routes({ location }) {
  const { isNarrowWidth } = useResponsive();
  return (
    <Switch location={location}>
      <Route path="/" exact render={() => <Redirect to="/budget" />} />

      <Route path="/reports">
        <NarrowNotSupported>
          <Reports />
        </NarrowNotSupported>
      </Route>

      <Route path="/budget">
        {isNarrowWidth ? <MobileBudget /> : <Budget />}
      </Route>

      <Route path="/schedules" exact>
        <NarrowNotSupported>
          <Schedules />
        </NarrowNotSupported>
      </Route>
      <Route path="/schedule/edit" exact>
        <NarrowNotSupported>
          <EditSchedule />
        </NarrowNotSupported>
      </Route>
      <Route path="/schedule/edit/:id">
        <NarrowNotSupported>
          <EditSchedule />
        </NarrowNotSupported>
      </Route>
      <Route path="/schedule/link">
        <NarrowNotSupported>
          <LinkSchedule />
        </NarrowNotSupported>
      </Route>
      <Route path="/schedule/discover">
        <NarrowNotSupported>
          <DiscoverSchedules />
        </NarrowNotSupported>
      </Route>
      <Route path="/schedule/posts-offline-notification">
        <PostsOfflineNotification />
      </Route>

      <Route path="/payees" exact>
        <ManagePayeesPage />
      </Route>
      <Route path="/rules" exact>
        <ManageRulesPage />
      </Route>
      <Route path="/settings">
        <Settings />
      </Route>
      <Route path="/nordigen/link" exact>
        <NarrowNotSupported>
          <NordigenLink />
        </NarrowNotSupported>
      </Route>

      <Route path="/accounts/:id" exact>
        {props => {
          const AcctCmp = isNarrowWidth ? MobileAccount : Account;
          return (
            props.match && <AcctCmp key={props.match.params.id} {...props} />
          );
        }}
      </Route>
      <Route path="/accounts" exact>
        {isNarrowWidth ? <MobileAccounts /> : <Account />}
      </Route>
    </Switch>
  );
}

function StackedRoutes() {
  let location = useLocation();
  let locationPtr = getLocationState(location, 'locationPtr');

  let locations = [location];
  while (locationPtr) {
    locations.unshift(locationPtr);
    locationPtr = getLocationState(locationPtr, 'locationPtr');
  }

  let base = locations[0];
  let stack = locations.slice(1);

  return (
    <ActiveLocationProvider location={locations[locations.length - 1]}>
      <Routes location={base} />
      {stack.map((location, idx) => (
        <PageTypeProvider
          key={location.key}
          type="modal"
          current={idx === stack.length - 1}
        >
          <Routes location={location} />
        </PageTypeProvider>
      ))}
    </ActiveLocationProvider>
  );
}

function NavTab({ icon: TabIcon, name, path }) {
  return (
    <NavLink
      to={path}
      style={{
        alignItems: 'center',
        color: '#8E8E8F',
        display: 'flex',
        flexDirection: 'column',
        textDecoration: 'none',
      }}
      activeStyle={{ color: colors.p5 }}
    >
      <TabIcon
        width={22}
        height={22}
        style={{ color: 'inherit', marginBottom: '5px' }}
      />
      {name}
    </NavLink>
  );
}

function MobileNavTabs() {
  const { isNarrowWidth } = useResponsive();
  return (
    <div
      style={{
        backgroundColor: 'white',
        borderTop: `1px solid ${colors.n10}`,
        bottom: 0,
        ...styles.shadow,
        display: isNarrowWidth ? 'flex' : 'none',
        height: '80px',
        justifyContent: 'space-around',
        paddingTop: 10,
        width: '100%',
      }}
    >
      <NavTab name="Budget" path="/budget" icon={Wallet} />
      <NavTab name="Accounts" path="/accounts" icon={PiggyBank} />
      <NavTab name="Settings" path="/settings" icon={Cog} />
    </div>
  );
}

function FinancesApp(props) {
  const [patchedHistory] = useState(() => createBrowserHistory());

  useEffect(() => {
    let oldPush = patchedHistory.push;
    patchedHistory.push = (to, state) => {
      let newState = makeLocationState(to.state || state);
      if (typeof to === 'object') {
        return oldPush.call(patchedHistory, { ...to, state: newState });
      } else {
        return oldPush.call(patchedHistory, to, newState);
      }
    };

    // I'm not sure if this is the best approach but we need this to
    // globally. We could instead move various workflows inside global
    // React components, but that's for another day.
    window.__history = patchedHistory;

    undo.setUndoState('url', window.location.href);

    const cleanup = patchedHistory.listen(location => {
      undo.setUndoState('url', window.location.href);
    });

    return cleanup;
  }, []);

  useEffect(() => {
    // TODO: quick hack fix for showing the demo
    if (patchedHistory.location.pathname === '/subscribe') {
      patchedHistory.push('/');
    }

    // Get the accounts and check if any exist. If there are no
    // accounts, we want to redirect the user to the All Accounts
    // screen which will prompt them to add an account
    props.getAccounts().then(accounts => {
      if (accounts.length === 0) {
        patchedHistory.push('/accounts');
      }
    });

    // The default key handler scope
    hotkeys.setScope('app');

    // Wait a little bit to make sure the sync button will get the
    // sync start event. This can be improved later.
    setTimeout(async () => {
      await props.sync();

      // Check for upgrade notifications. We do this after syncing
      // because these states are synced across devices, so they will
      // only see it once for this file
      checkForUpgradeNotifications(
        props.addNotification,
        props.resetSync,
        patchedHistory,
      );

      await checkForUpdateNotification(
        props.addNotification,
        getIsOutdated,
        getLatestVersion,
        props.loadPrefs,
        props.savePrefs,
      );
    }, 100);
  }, []);

  return (
    <Router history={patchedHistory}>
      <CompatRouter>
        <View style={{ height: '100%', backgroundColor: colors.n10 }}>
          <GlobalKeys />

          <View style={{ flexDirection: 'row', flex: 1 }}>
            <FloatableSidebar />

            <View
              style={{
                flex: 1,
                overflow: 'hidden',
                width: '100%',
              }}
            >
              <Titlebar
                style={{
                  WebkitAppRegion: 'drag',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  zIndex: 1000,
                }}
              />
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  overflow: 'auto',
                  position: 'relative',
                }}
              >
                <Notifications />
                <BankSyncStatus />
                <StackedRoutes />
                <Modals history={patchedHistory} />
              </div>

              <Switch>
                <Route path="/budget">
                  <MobileNavTabs />
                </Route>
                <Route path="/accounts">
                  <MobileNavTabs />
                </Route>
                <Route path="/settings">
                  <MobileNavTabs />
                </Route>
              </Switch>
            </View>
          </View>
        </View>
      </CompatRouter>
    </Router>
  );
}

function FinancesAppWithContext(props) {
  let app = useMemo(() => <FinancesApp {...props} />, [props]);

  return (
    <SpreadsheetProvider>
      <TitlebarProvider>
        <SidebarProvider>
          <BudgetMonthCountProvider>
            <PayeesProvider>
              <AccountsProvider>
                <DndProvider backend={Backend}>{app}</DndProvider>
              </AccountsProvider>
            </PayeesProvider>
          </BudgetMonthCountProvider>
        </SidebarProvider>
      </TitlebarProvider>
    </SpreadsheetProvider>
  );
}

export default connect(null, actions)(FinancesAppWithContext);
