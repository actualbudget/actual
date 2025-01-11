// @ts-strict-ignore
import React, { type ReactElement, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Route,
  Routes,
  Navigate,
  useLocation,
  useHref,
} from 'react-router-dom';

import { sync } from 'loot-core/client/app/appSlice';
import { addNotification } from 'loot-core/client/notifications/notificationsSlice';
import * as undo from 'loot-core/src/platform/client/undo';

import { ProtectedRoute } from '../auth/ProtectedRoute';
import { Permissions } from '../auth/types';
import { useAccounts } from '../hooks/useAccounts';
import { useLocalPref } from '../hooks/useLocalPref';
import { useMetaThemeColor } from '../hooks/useMetaThemeColor';
import { useNavigate } from '../hooks/useNavigate';
import { useSelector, useDispatch } from '../redux';
import { theme } from '../style';
import { getIsOutdated, getLatestVersion } from '../util/versions';

import { UserAccessPage } from './admin/UserAccess/UserAccessPage';
import { BankSyncStatus } from './BankSyncStatus';
import { View } from './common/View';
import { GlobalKeys } from './GlobalKeys';
import { ManageRulesPage } from './ManageRulesPage';
import { Category } from './mobile/budget/Category';
import { MobileNavTabs } from './mobile/MobileNavTabs';
import { TransactionEdit } from './mobile/transactions/TransactionEdit';
import { Notifications } from './Notifications';
import { ManagePayeesPage } from './payees/ManagePayeesPage';
import { Reports } from './reports';
import { LoadingIndicator } from './reports/LoadingIndicator';
import { NarrowAlternate, WideComponent } from './responsive';
import { useResponsive } from './responsive/ResponsiveProvider';
import { UserDirectoryPage } from './responsive/wide';
import { ScrollProvider } from './ScrollProvider';
import { useMultiuserEnabled } from './ServerContext';
import { Settings } from './settings';
import { FloatableSidebar } from './sidebar';
import { Titlebar } from './Titlebar';

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
  const location = useLocation();
  const href = useHref(location);
  useEffect(() => {
    undo.setUndoState('url', href);
  }, [href]);

  return null;
}

export function FinancesApp() {
  const { isNarrowWidth } = useResponsive();
  useMetaThemeColor(isNarrowWidth ? theme.mobileViewTheme : null);

  const dispatch = useDispatch();
  const { t } = useTranslation();

  const accounts = useAccounts();
  const accountsLoaded = useSelector(state => state.queries.accountsLoaded);

  const [lastUsedVersion, setLastUsedVersion] = useLocalPref(
    'flags.updateNotificationShownForVersion',
  );

  const multiuserEnabled = useMultiuserEnabled();

  useEffect(() => {
    // Wait a little bit to make sure the sync button will get the
    // sync start event. This can be improved later.
    setTimeout(async () => {
      await dispatch(sync());
    }, 100);
  }, []);

  useEffect(() => {
    async function run() {
      await global.Actual.waitForUpdateReadyForDownload();
      dispatch(
        addNotification({
          notification: {
            type: 'message',
            title: t('A new version of Actual is available!'),
            message: t(
              'Click the button below to reload and apply the update.',
            ),
            sticky: true,
            id: 'update-reload-notification',
            button: {
              title: t('Update now'),
              action: async () => {
                await global.Actual.applyAppUpdate();
              },
            },
          },
        }),
      );
    }

    run();
  }, []);

  useEffect(() => {
    async function run() {
      const latestVersion = await getLatestVersion();
      const isOutdated = await getIsOutdated(latestVersion);

      if (isOutdated && lastUsedVersion !== latestVersion) {
        dispatch(
          addNotification({
            notification: {
              type: 'message',
              title: t('A new version of Actual is available!'),
              message: t(
                'Version {{latestVersion}} of Actual was recently released.',
                { latestVersion },
              ),
              sticky: true,
              id: 'update-notification',
              button: {
                title: t('Open changelog'),
                action: () => {
                  window.open('https://actualbudget.org/docs/releases');
                },
              },
              onClose: () => {
                setLastUsedVersion(latestVersion);
              },
            },
          }),
        );
      }
    }

    run();
  }, [lastUsedVersion, setLastUsedVersion]);

  const scrollableRef = useRef<HTMLDivElement>(null);

  return (
    <View style={{ height: '100%' }}>
      <RouterBehaviors />
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
          <ScrollProvider
            isDisabled={!isNarrowWidth}
            scrollableRef={scrollableRef}
          >
            <View
              ref={scrollableRef}
              style={{
                flex: 1,
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
                <Route
                  path="/"
                  element={
                    accountsLoaded ? (
                      accounts.length > 0 ? (
                        <Navigate to="/budget" replace />
                      ) : (
                        // If there are no accounts, we want to redirect the user to
                        // the All Accounts screen which will prompt them to add an account
                        <Navigate to="/accounts" replace />
                      )
                    ) : (
                      <LoadingIndicator />
                    )
                  }
                />

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
                {multiuserEnabled && (
                  <Route
                    path="/user-directory"
                    element={
                      <ProtectedRoute
                        permission={Permissions.ADMINISTRATOR}
                        element={<UserDirectoryPage />}
                      />
                    }
                  />
                )}
                {multiuserEnabled && (
                  <Route
                    path="/user-access"
                    element={
                      <ProtectedRoute
                        permission={Permissions.ADMINISTRATOR}
                        validateOwner={true}
                        element={<UserAccessPage />}
                      />
                    }
                  />
                )}
                {/* redirect all other traffic to the budget page */}
                <Route path="/*" element={<Navigate to="/budget" replace />} />
              </Routes>
            </View>

            <Routes>
              <Route path="/budget" element={<MobileNavTabs />} />
              <Route path="/accounts" element={<MobileNavTabs />} />
              <Route path="/settings" element={<MobileNavTabs />} />
              <Route path="/reports" element={<MobileNavTabs />} />
              <Route path="*" element={null} />
            </Routes>
          </ScrollProvider>
        </View>
      </View>
    </View>
  );
}
