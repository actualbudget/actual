import React, { type ReactElement, useEffect, useMemo } from 'react';
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
import { theme, styles } from '../style';
import { ExposeNavigate } from '../util/router-tools';
import { getIsOutdated, getLatestVersion } from '../util/versions';

import BankSyncStatus from './BankSyncStatus';
import { BudgetMonthCountProvider } from './budget/BudgetMonthCountContext';
import { View } from './common';
import FloatableSidebar, { SidebarProvider } from './FloatableSidebar';
import GlobalKeys from './GlobalKeys';
import { ManageRulesPage } from './ManageRulesPage';
import Modals from './Modals';
import Notifications from './Notifications';
import { ManagePayeesPage } from './payees/ManagePayeesPage';
import Reports from './reports';
import { NarrowAlternate, WideComponent } from './responsive';
import Settings from './settings';
import Titlebar, { TitlebarProvider } from './Titlebar';

function NarrowNotSupported({
  redirectTo = '/budget',
  children,
}: {
  redirectTo?: string;
  children: ReactElement;
}) {
  const { isNarrowWidth } = useResponsive();
  const navigate = useNavigate();
  useEffect(() => {
    if (isNarrowWidth) {
      navigate(redirectTo);
    }
  }, [isNarrowWidth, navigate, redirectTo]);
  return isNarrowWidth ? null : children;
}

function NavTab({ icon: TabIcon, name, path }) {
  return (
    <NavLink
      to={path}
      style={({ isActive }) => ({
        alignItems: 'center',
        color: isActive
          ? theme.sidebarItemAccentSelected
          : theme.sidebarItemText,
        display: 'flex',
        flexDirection: 'column',
        textDecoration: 'none',
      })}
    >
      <TabIcon width={22} height={22} style={{ marginBottom: '5px' }} />
      {name}
    </NavLink>
  );
}

function MobileNavTabs() {
  const { isNarrowWidth } = useResponsive();
  return (
    <div
      style={{
        backgroundColor: theme.sidebarBackground,
        borderTop: `1px solid ${theme.menuBorder}`,
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

  return null;
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

      <View style={{ height: '100%' }}>
        <GlobalKeys />

        <View style={{ flexDirection: 'row', flex: 1 }}>
          <FloatableSidebar />

          <View
            style={{
              color: theme.pageText,
              backgroundColor: theme.pageBackground,
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

              <Routes>
                <Route path="/" element={<Navigate to="/budget" replace />} />

                <Route
                  path="/reports/*"
                  element={
                    <NarrowNotSupported>
                      {/* Has its own lazy loading logic */}
                      <Reports />
                    </NarrowNotSupported>
                  }
                />

                <Route
                  path="/budget"
                  element={<NarrowAlternate name="Budget" />}
                />

                <Route
                  path="/schedules"
                  element={
                    <NarrowNotSupported>
                      <WideComponent name="Schedules" />
                    </NarrowNotSupported>
                  }
                />

                <Route path="/payees" element={<ManagePayeesPage />} />
                <Route path="/rules" element={<ManageRulesPage />} />
                <Route path="/settings" element={<Settings />} />

                {/* TODO: remove Nordigen route after v23.8.0 */}
                <Route
                  path="/nordigen/link"
                  element={
                    <NarrowNotSupported>
                      <WideComponent name="GoCardlessLink" />
                    </NarrowNotSupported>
                  }
                />
                <Route
                  path="/gocardless/link"
                  element={
                    <NarrowNotSupported>
                      <WideComponent name="GoCardlessLink" />
                    </NarrowNotSupported>
                  }
                />

                <Route
                  path="/accounts/:id"
                  element={<NarrowAlternate name="Account" />}
                />

                <Route
                  path="/accounts"
                  element={<NarrowAlternate name="Accounts" />}
                />
              </Routes>

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
