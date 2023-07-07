import React, { useEffect, useMemo } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend as Backend } from 'react-dnd-html5-backend';
import { connect } from 'react-redux';
import {
  Route,
  Routes,
  Navigate,
  NavLink,
  useNavigate,
  BrowserRouter,
  useLocation,
  useHref,
} from 'react-router-dom';

import hotkeys from 'hotkeys-js';

import * as actions from 'loot-core/src/client/actions';
import { AccountsProvider } from 'loot-core/src/client/data-hooks/accounts';
import { PayeesProvider } from 'loot-core/src/client/data-hooks/payees';
import { SpreadsheetProvider } from 'loot-core/src/client/SpreadsheetProvider';
import checkForUpdateNotification from 'loot-core/src/client/update-notification';
import * as undo from 'loot-core/src/platform/client/undo';

import Cog from '../icons/v1/Cog';
import PiggyBank from '../icons/v1/PiggyBank';
import Wallet from '../icons/v1/Wallet';
import { useResponsive } from '../ResponsiveProvider';
import { colors, styles } from '../style';
import { ExposeNavigate, StackedRoutes } from '../util/router-tools';
import { getIsOutdated, getLatestVersion } from '../util/versions';

import Account from './accounts/Account';
import MobileAccount from './accounts/MobileAccount';
import MobileAccounts from './accounts/MobileAccounts';
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
  const navigate = useNavigate();
  useEffect(() => {
    if (isNarrowWidth) {
      navigate(redirectTo);
    }
  }, [isNarrowWidth, navigate, redirectTo]);
  return isNarrowWidth ? null : children;
}

function StackedRoutesInner({ location }) {
  const { isNarrowWidth } = useResponsive();
  return (
    <Routes location={location}>
      <Route path="/" element={<Navigate to="/budget" replace />} />

      <Route
        path="/reports/*"
        element={
          <NarrowNotSupported>
            <Reports />
          </NarrowNotSupported>
        }
      />

      <Route
        path="/budget"
        element={isNarrowWidth ? <MobileBudget /> : <Budget />}
      />

      <Route
        path="/schedules"
        element={
          <NarrowNotSupported>
            <Schedules />
          </NarrowNotSupported>
        }
      />

      <Route
        path="/schedule/edit"
        element={
          <NarrowNotSupported>
            <EditSchedule />
          </NarrowNotSupported>
        }
      />
      <Route
        path="/schedule/edit/:id"
        element={
          <NarrowNotSupported>
            <EditSchedule />
          </NarrowNotSupported>
        }
      />
      <Route
        path="/schedule/link"
        element={
          <NarrowNotSupported>
            <LinkSchedule />
          </NarrowNotSupported>
        }
      />
      <Route
        path="/schedule/discover"
        element={
          <NarrowNotSupported>
            <DiscoverSchedules />
          </NarrowNotSupported>
        }
      />

      <Route
        path="/schedule/posts-offline-notification"
        element={<PostsOfflineNotification />}
      />

      <Route path="/payees" element={<ManagePayeesPage />} />
      <Route path="/rules" element={<ManageRulesPage />} />
      <Route path="/settings" element={<Settings />} />
      <Route
        path="/nordigen/link"
        element={
          <NarrowNotSupported>
            <NordigenLink />
          </NarrowNotSupported>
        }
      />

      <Route
        path="/accounts/:id"
        element={isNarrowWidth ? <MobileAccount /> : <Account />}
      />

      <Route
        path="/accounts"
        element={isNarrowWidth ? <MobileAccounts /> : <Account />}
      />
    </Routes>
  );
}

function NavTab({ icon: TabIcon, name, path }) {
  return (
    <NavLink
      to={path}
      style={({ isActive }) => ({
        alignItems: 'center',
        color: isActive ? colors.p5 : '#8E8E8F',
        display: 'flex',
        flexDirection: 'column',
        textDecoration: 'none',
      })}
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

function RouterBehaviors({ getAccounts }) {
  let navigate = useNavigate();
  useEffect(() => {
    // Get the accounts and check if any exist. If there are no
    // accounts, we want to redirect the user to the All Accounts
    // screen which will prompt them to add an account
    getAccounts().then(accounts => {
      if (accounts.length === 0) {
        navigate('/accounts');
      }
    });
  }, []);

  let location = useLocation();
  let href = useHref(location);
  useEffect(() => {
    undo.setUndoState('url', href);
  }, [href]);
}

function FinancesApp(props) {
  useEffect(() => {
    // The default key handler scope
    hotkeys.setScope('app');

    // Wait a little bit to make sure the sync button will get the
    // sync start event. This can be improved later.
    setTimeout(async () => {
      await props.sync();

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
    <BrowserRouter>
      <RouterBehaviors getAccounts={props.getAccounts} />
      <ExposeNavigate />

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
              <StackedRoutes
                render={location => <StackedRoutesInner location={location} />}
              />
              <Modals />
            </div>

            <Routes>
              <Route path="/budget" element={<MobileNavTabs />} />
              <Route path="/accounts" element={<MobileNavTabs />} />
              <Route path="/settings" element={<MobileNavTabs />} />
              <Route path="*" element={null} />
            </Routes>
          </View>
        </View>
      </View>
    </BrowserRouter>
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
