// @ts-strict-ignore
import React, { type ReactElement, useEffect, useMemo } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend as Backend } from 'react-dnd-html5-backend';
import { useSelector } from 'react-redux';
import {
  Route,
  Routes,
  Navigate,
  BrowserRouter,
  useLocation,
  useHref,
} from 'react-router-dom';

import { SpreadsheetProvider } from 'loot-core/src/client/SpreadsheetProvider';
import { type State } from 'loot-core/src/client/state-types';
import { checkForUpdateNotification } from 'loot-core/src/client/update-notification';
import * as undo from 'loot-core/src/platform/client/undo';

import { useAccounts } from '../hooks/useAccounts';
import { useActions } from '../hooks/useActions';
import { useNavigate } from '../hooks/useNavigate';
import { useResponsive } from '../ResponsiveProvider';
import { theme } from '../style';
import { ExposeNavigate } from '../util/router-tools';
import { getIsOutdated, getLatestVersion } from '../util/versions';

import { BankSyncStatus } from './BankSyncStatus';
import { BudgetMonthCountProvider } from './budget/BudgetMonthCountContext';
import { View } from './common/View';
import { GlobalKeys } from './GlobalKeys';
import { ManageRulesPage } from './ManageRulesPage';
import { Category } from './mobile/budget/Category';
import { MobileNavTabs } from './mobile/MobileNavTabs';
import { TransactionEdit } from './mobile/transactions/TransactionEdit';
import { Modals } from './Modals';
import { Notifications } from './Notifications';
import { ManagePayeesPage } from './payees/ManagePayeesPage';
import { Reports } from './reports';
import { NarrowAlternate, WideComponent } from './responsive';
import { ScrollProvider } from './ScrollProvider';
import { Settings } from './settings';
import { FloatableSidebar } from './sidebar';
import { SidebarProvider } from './sidebar/SidebarProvider';
import { Titlebar, TitlebarProvider } from './Titlebar';

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

function WideNotSupported({ children, redirectTo = '/budget' }) {
  const { isNarrowWidth } = useResponsive();
  const navigate = useNavigate();
  useEffect(() => {
    if (!isNarrowWidth) {
      navigate(redirectTo);
    }
  }, [isNarrowWidth, navigate, redirectTo]);
  return isNarrowWidth ? children : null;
}

function RouterBehaviors() {
  const navigate = useNavigate();
  const accounts = useAccounts();
  const accountsLoaded = useSelector(
    (state: State) => state.queries.accountsLoaded,
  );
  useEffect(() => {
    // If there are no accounts, we want to redirect the user to
    // the All Accounts screen which will prompt them to add an account
    if (accountsLoaded && accounts.length === 0) {
      navigate('/accounts');
    }
  }, [accountsLoaded, accounts]);

  const location = useLocation();
  const href = useHref(location);
  useEffect(() => {
    undo.setUndoState('url', href);
  }, [href]);

  return null;
}

function FinancesAppWithoutContext() {
  const actions = useActions();
  useEffect(() => {
    // Wait a little bit to make sure the sync button will get the
    // sync start event. This can be improved later.
    setTimeout(async () => {
      await actions.sync();

      await checkForUpdateNotification(
        actions.addNotification,
        getIsOutdated,
        getLatestVersion,
        actions.loadPrefs,
        actions.savePrefs,
      );
    }, 100);
  }, []);

  return (
    <BrowserRouter>
      <RouterBehaviors />
      <ExposeNavigate />

      <View style={{ height: '100%' }}>
        <GlobalKeys />

        <View
          style={{
            flexDirection: 'row',
            backgroundColor: theme.pageBackground,
            flex: 1,
          }}
        >
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
            <div
              style={{
                flex: 1,
                display: 'flex',
                overflow: 'auto',
                position: 'relative',
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
              <Notifications />
              <BankSyncStatus />

              <Routes>
                <Route path="/" element={<Navigate to="/budget" replace />} />

                <Route path="/reports/*" element={<Reports />} />

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

                <Route
                  path="/gocardless/link"
                  element={
                    <NarrowNotSupported>
                      <WideComponent name="GoCardlessLink" />
                    </NarrowNotSupported>
                  }
                />

                <Route
                  path="/accounts"
                  element={<NarrowAlternate name="Accounts" />}
                />

                <Route
                  path="/accounts/:id"
                  element={<NarrowAlternate name="Account" />}
                />

                <Route
                  path="/transactions/:transactionId"
                  element={
                    <WideNotSupported>
                      <TransactionEdit />
                    </WideNotSupported>
                  }
                />

                <Route
                  path="/categories/:id"
                  element={
                    <WideNotSupported>
                      <Category />
                    </WideNotSupported>
                  }
                />

                {/* redirect all other traffic to the budget page */}
                <Route path="/*" element={<Navigate to="/budget" replace />} />
              </Routes>

              <Modals />
            </div>

            <Routes>
              <Route path="/budget" element={<MobileNavTabs />} />
              <Route path="/accounts" element={<MobileNavTabs />} />
              <Route path="/settings" element={<MobileNavTabs />} />
              <Route path="/reports" element={<MobileNavTabs />} />
              <Route path="*" element={null} />
            </Routes>
          </View>
        </View>
      </View>
    </BrowserRouter>
  );
}

export function FinancesApp() {
  const app = useMemo(() => <FinancesAppWithoutContext />, []);

  return (
    <SpreadsheetProvider>
      <TitlebarProvider>
        <SidebarProvider>
          <BudgetMonthCountProvider>
            <DndProvider backend={Backend}>
              <ScrollProvider>{app}</ScrollProvider>
            </DndProvider>
          </BudgetMonthCountProvider>
        </SidebarProvider>
      </TitlebarProvider>
    </SpreadsheetProvider>
  );
}
