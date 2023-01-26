import React, { useMemo } from 'react';
import { DndProvider } from 'react-dnd';
import Backend from 'react-dnd-html5-backend';
import { connect } from 'react-redux';
import {
  Router,
  Route,
  Redirect,
  Switch,
  useLocation,
  NavLink
} from 'react-router-dom';
import { CompatRouter } from 'react-router-dom-v5-compat';

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
import { colors, styles } from 'loot-design/src/style';
import Cog from 'loot-design/src/svg/v1/Cog';
import PiggyBank from 'loot-design/src/svg/v1/PiggyBank';
import Wallet from 'loot-design/src/svg/v1/Wallet';

import { isMobile } from '../util';
import { getLocationState, makeLocationState } from '../util/location-state';

import Account from './accounts/Account';
import { default as MobileAccount } from './accounts/MobileAccount';
import { default as MobileAccounts } from './accounts/MobileAccounts';
import { ActiveLocationProvider } from './ActiveLocation';
import BankSyncStatus from './BankSyncStatus';
import Budget from './budget';
import { default as MobileBudget } from './budget/MobileBudget';
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
import Settings from './settings';
import Titlebar, { TitlebarProvider } from './Titlebar';
// import Debugger from './Debugger';

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

function Routes({ isMobile, location }) {
  return (
    <Switch location={location}>
      <Route path="/">
        <Route path="/" exact render={() => <Redirect to="/budget" />} />

        <PageRoute path="/reports" component={Reports} />
        <PageRoute
          path="/budget"
          component={isMobile ? MobileBudget : Budget}
        />

        <Route path="/schedules" exact component={Schedules} />
        <Route path="/schedule/edit" exact component={EditSchedule} />
        <Route path="/schedule/edit/:id" component={EditSchedule} />
        <Route path="/schedule/link" component={LinkSchedule} />
        <Route path="/schedule/discover" component={DiscoverSchedules} />
        <Route
          path="/schedule/posts-offline-notification"
          component={PostsOfflineNotification}
        />

        <Route path="/payees" exact component={ManagePayeesPage} />
        <Route path="/rules" exact component={ManageRulesPage} />
        <Route path="/settings" component={Settings} />

        <Route
          path="/accounts/:id"
          exact
          children={props => {
            const AcctCmp = isMobile ? MobileAccount : Account;
            return (
              props.match && <AcctCmp key={props.match.params.id} {...props} />
            );
          }}
        />
        <Route
          path="/accounts"
          exact
          component={isMobile ? MobileAccounts : Account}
        />
      </Route>
    </Switch>
  );
}

function StackedRoutes({ isMobile }) {
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
      <Routes location={base} isMobile={isMobile} />
      {stack.map((location, idx) => (
        <PageTypeProvider
          key={location.key}
          type="modal"
          current={idx === stack.length - 1}
        >
          <Routes location={location} isMobile={isMobile} />
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
        textDecoration: 'none'
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
  return (
    <div
      style={{
        backgroundColor: 'white',
        borderTop: `1px solid ${colors.n10}`,
        bottom: 0,
        ...styles.shadow,
        display: 'flex',
        height: '80px',
        justifyContent: 'space-around',
        paddingTop: 10,
        width: '100%'
      }}
    >
      <NavTab name="Budget" path="/budget" icon={Wallet} isActive={false} />
      <NavTab
        name="Accounts"
        path="/accounts"
        icon={PiggyBank}
        isActive={false}
      />
      <NavTab name="Settings" path="/settings" icon={Cog} isActive={false} />
    </div>
  );
}

class FinancesApp extends React.Component {
  constructor(props) {
    super(props);
    this.state = { isMobile: isMobile(window.innerWidth) };
    this.history = createBrowserHistory();

    let oldPush = this.history.push;
    this.history.push = (to, state) => {
      let newState = makeLocationState(to.state || state);
      if (typeof to === 'object') {
        return oldPush.call(this.history, { ...to, state: newState });
      } else {
        return oldPush.call(this.history, to, newState);
      }
    };

    // I'm not sure if this is the best approach but we need this to
    // globally. We could instead move various workflows inside global
    // React components, but that's for another day.
    window.__history = this.history;

    undo.setUndoState('url', window.location.href);

    this.cleanup = this.history.listen(location => {
      undo.setUndoState('url', window.location.href);
    });

    this.handleWindowResize = this.handleWindowResize.bind(this);
  }

  handleWindowResize() {
    this.setState({
      isMobile: isMobile(window.innerWidth),
      windowWidth: window.innerWidth
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

    window.addEventListener('resize', this.handleWindowResize);
  }

  componentWillUnmount() {
    this.cleanup();
    window.removeEventListener('resize', this.handleWindowResize);
  }

  render() {
    return (
      <Router history={this.history}>
        <CompatRouter>
          <View style={{ height: '100%', backgroundColor: colors.n10 }}>
            <GlobalKeys />

            <View style={{ flexDirection: 'row', flex: 1 }}>
              {!this.state.isMobile && <FloatableSidebar />}

              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                  position: 'relative',
                  width: '100%'
                }}
              >
                {!this.state.isMobile && (
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
                )}
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
                  <StackedRoutes isMobile={this.state.isMobile} />
                  {/*window.Actual.IS_DEV && <Debugger />*/}
                  <Modals history={this.history} />
                </div>
                {this.state.isMobile && (
                  <Switch>
                    <Route path="/budget" component={MobileNavTabs} />
                    <Route path="/accounts" component={MobileNavTabs} />
                    <Route path="/settings" component={MobileNavTabs} />
                  </Switch>
                )}
              </div>
            </View>
          </View>
        </CompatRouter>
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
