import React, { useMemo } from 'react';
import { DndProvider } from 'react-dnd';
import Backend from 'react-dnd-html5-backend';
import { connect } from 'react-redux';
import { Router, Route, Redirect, Switch, useLocation } from 'react-router-dom';

import { createBrowserHistory } from 'history';
import hotkeys from 'hotkeys-js';

import * as actions from 'loot-core/src/client/actions';
import { AccountsProvider } from 'loot-core/src/client/data-hooks/accounts';
import { PayeesProvider } from 'loot-core/src/client/data-hooks/payees';
import { SpreadsheetProvider } from 'loot-core/src/client/SpreadsheetProvider';
import checkForUpgradeNotifications from 'loot-core/src/client/upgrade-notifications';
import * as undo from 'loot-core/src/platform/client/undo';
import { BudgetMonthCountProvider } from 'loot-design/src/components/budget/BudgetMonthCountContext';
import { View } from 'loot-design/src/components/common';
import { colors } from 'loot-design/src/style';

import { getLocationState, makeLocationState } from '../util/location-state';
import Account from './accounts/Account';
import { ActiveLocationProvider } from './ActiveLocation';
import BankSyncStatus from './BankSyncStatus';
import Budget from './budget';
import FloatableSidebar, { SidebarProvider } from './FloatableSidebar';
import GlobalKeys from './GlobalKeys';
import { ManageRulesPage } from './ManageRulesPage';
import Modals from './Modals';
import Notifications from './Notifications';
import { PageTypeProvider } from './Page';
import { ManagePayeesPage } from './payees/ManagePayeesPage';
import Reports from './reports';
import Schedules from './schedules';
import DiscoverSchedules from './schedules/DiscoverSchedules';
import EditSchedule from './schedules/EditSchedule';
import LinkSchedule from './schedules/LinkSchedule';
import PostsOfflineNotification from './schedules/PostsOfflineNotification';
import Settings from './Settings';
import Titlebar, { TitlebarProvider } from './Titlebar';
import FixSplitsTool from './tools/FixSplitsTool';
// import Debugger from './Debugger';

function URLBar() {
  let location = useLocation();

  return (
    <View
      style={{
        position: 'absolute',
        bottom: 0,
        right: 0,
        margin: 15,
        backgroundColor: colors.n9,
        padding: 8,
        borderRadius: 6
      }}
    >
      {location.pathname}
    </View>
  );
}

function PageRoute({ path, component: Component }) {
  return (
    <Route
      path={path}
      children={props => {
        return (
          <View
            style={{
              flex: 1,
              display: props.match ? 'flex' : 'none'
            }}
          >
            <Component {...props} />
          </View>
        );
      }}
    />
  );
}

function Routes({ location }) {
  return (
    <Switch location={location}>
      <Route path="/">
        <Route path="/" exact render={() => <Redirect to="/budget" />} />

        <PageRoute path="/reports" component={Reports} />
        <PageRoute path="/budget" component={Budget} />

        <Route path="/schedules" exact component={Schedules} />
        <Route path="/schedule/edit" exact component={EditSchedule} />
        <Route path="/schedule/edit/:id" component={EditSchedule} />
        <Route path="/schedule/link" component={LinkSchedule} />
        <Route path="/schedule/discover" component={DiscoverSchedules} />
        <Route
          path="/schedule/posts-offline-notification"
          component={PostsOfflineNotification}
        />

        <Route path="/rules" exact component={ManageRulesPage} />
        <Route path="/payees" exact component={ManagePayeesPage} />
        <Route path="/tools/fix-splits" exact component={FixSplitsTool} />

        <Route
          path="/accounts/:id"
          exact
          children={props => {
            return (
              props.match && <Account key={props.match.params.id} {...props} />
            );
          }}
        />
        <Route path="/accounts" exact component={Account} />
        <Route path="/settings" component={Settings} />
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

class FinancesApp extends React.Component {
  constructor(props) {
    super(props);
    this.history = createBrowserHistory();

    let oldPush = this.history.push;
    this.history.push = (to, state) => {
      return oldPush.call(this.history, to, makeLocationState(state));
    };

    // I'm not sure if this is the best approach but we need this to
    // globally. We could instead move various workflows inside global
    // React components, but that's for another day.
    window.__history = this.history;

    undo.setUndoState('url', window.location.href);

    this.cleanup = this.history.listen(location => {
      undo.setUndoState('url', window.location.href);
    });
  }

  componentDidMount() {
    // TODO: quick hack fix for showing the demo
    if (this.history.location.pathname === '/subscribe') {
      this.history.push('/');
    }

    // Get the accounts and check if any exist. If there are no
    // accounts, we want to redirect the user to the All Accounts
    // screen which will prompt them to add an account
    this.props.getAccounts().then(accounts => {
      if (accounts.length === 0) {
        this.history.push('/accounts');
      }
    });

    // The default key handler scope
    hotkeys.setScope('app');

    // Wait a little bit to make sure the sync button will get the
    // sync start event. This can be improved later.
    setTimeout(async () => {
      await this.props.sync();

      // Check for upgrade notifications. We do this after syncing
      // because these states are synced across devices, so they will
      // only see it once for this file
      checkForUpgradeNotifications(
        this.props.addNotification,
        this.props.resetSync,
        this.history
      );
    }, 100);
  }

  componentWillUnmount() {
    this.cleanup();
  }

  render() {
    return (
      <Router history={this.history}>
        <View style={{ height: '100%', backgroundColor: colors.n10 }}>
          <GlobalKeys />

          <View style={{ flexDirection: 'row', flex: 1 }}>
            <FloatableSidebar />

            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                position: 'relative'
              }}
            >
              <Titlebar
                style={{
                  WebkitAppRegion: 'drag',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  zIndex: 1000
                }}
              />
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  overflow: 'auto',
                  position: 'relative'
                }}
              >
                <Notifications />
                <BankSyncStatus />

                <StackedRoutes />

                {/*window.Actual.IS_DEV && <Debugger />*/}
                {/*window.Actual.IS_DEV && <URLBar />*/}

                <Modals history={this.history} />
              </div>
            </div>
          </View>
        </View>
      </Router>
    );
  }
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
