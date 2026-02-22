import React, { useEffect, useEffectEvent, useRef } from 'react';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, Route, Routes, useHref, useLocation } from 'react-router';

import { useResponsive } from '@actual-app/components/hooks/useResponsive';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { useQuery } from '@tanstack/react-query';

import * as undo from 'loot-core/platform/client/undo';

import { UserAccessPage } from './admin/UserAccess/UserAccessPage';
import { BankSyncStatus } from './BankSyncStatus';
import { CommandBar } from './CommandBar';
import { GlobalKeys } from './GlobalKeys';
import { MobileBankSyncAccountEditPage } from './mobile/banksync/MobileBankSyncAccountEditPage';
import { MobileNavTabs } from './mobile/MobileNavTabs';
import { TransactionEdit } from './mobile/transactions/TransactionEdit';
import { Notifications } from './Notifications';
import { Reports } from './reports';
import { LoadingIndicator } from './reports/LoadingIndicator';
import { NarrowAlternate, WideComponent } from './responsive';
import { UserDirectoryPage } from './responsive/wide';
import { useMultiuserEnabled } from './ServerContext';
import { Settings } from './settings';
import { FloatableSidebar } from './sidebar';
import { ManageTagsPage } from './tags/ManageTagsPage';
import { Titlebar } from './Titlebar';

import { accountQueries } from '@desktop-client/accounts';
import { getLatestAppVersion, sync } from '@desktop-client/app/appSlice';
import { ProtectedRoute } from '@desktop-client/auth/ProtectedRoute';
import { Permissions } from '@desktop-client/auth/types';
import { useGlobalPref } from '@desktop-client/hooks/useGlobalPref';
import { useLocalPref } from '@desktop-client/hooks/useLocalPref';
import { useMetaThemeColor } from '@desktop-client/hooks/useMetaThemeColor';
import { useNavigate } from '@desktop-client/hooks/useNavigate';
import { ScrollProvider } from '@desktop-client/hooks/useScrollListener';
import { addNotification } from '@desktop-client/notifications/notificationsSlice';
import { useDispatch, useSelector } from '@desktop-client/redux';

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
      void navigate(redirectTo);
    }
  }, [isNarrowWidth, navigate, redirectTo]);
  return isNarrowWidth ? null : children;
}

function WideNotSupported({
  children,
  redirectTo = '/budget',
}: {
  redirectTo?: string;
  children: ReactElement;
}) {
  const { isNarrowWidth } = useResponsive();
  const navigate = useNavigate();
  useEffect(() => {
    if (!isNarrowWidth) {
      void navigate(redirectTo);
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
  useMetaThemeColor(isNarrowWidth ? theme.mobileViewTheme : undefined);

  const dispatch = useDispatch();
  const { t } = useTranslation();

  // TODO: Replace with `useAccounts` hook once it's updated to return the useQuery results.
  const { data: accounts, isFetching: isAccountsFetching } = useQuery(
    accountQueries.list(),
  );

  const versionInfo = useSelector(state => state.app.versionInfo);
  const [notifyWhenUpdateIsAvailable] = useGlobalPref(
    'notifyWhenUpdateIsAvailable',
  );
  const [lastUsedVersion, setLastUsedVersion] = useLocalPref(
    'flags.updateNotificationShownForVersion',
  );

  const multiuserEnabled = useMultiuserEnabled();

  const init = useEffectEvent(() => {
    // Wait a little bit to make sure the sync button will get the
    // sync start event. This can be improved later.
    setTimeout(async () => {
      await dispatch(sync());
    }, 100);

    async function run() {
      await global.Actual.waitForUpdateReadyForDownload(); // This will only resolve when an update is ready
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

    void run();
  });

  useEffect(() => init(), []);

  useEffect(() => {
    void dispatch(getLatestAppVersion());
  }, [dispatch]);

  useEffect(() => {
    if (notifyWhenUpdateIsAvailable && versionInfo) {
      if (
        versionInfo.isOutdated &&
        lastUsedVersion !== versionInfo.latestVersion
      ) {
        dispatch(
          addNotification({
            notification: {
              type: 'message',
              title: t('A new version of Actual is available!'),
              message:
                (process.env.REACT_APP_IS_PIKAPODS ?? '').toLowerCase() ===
                'true'
                  ? t(
                      'A new version of Actual is available! Your Pikapods instance will be automatically updated in the next few days - no action needed.',
                    )
                  : t(
                      'Version {{latestVersion}} of Actual was recently released.',
                      { latestVersion: versionInfo.latestVersion },
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
                setLastUsedVersion(versionInfo.latestVersion);
              },
            },
          }),
        );
      }
    }
  }, [
    dispatch,
    lastUsedVersion,
    notifyWhenUpdateIsAvailable,
    setLastUsedVersion,
    t,
    versionInfo,
  ]);

  const scrollableRef = useRef<HTMLDivElement>(null);

  return (
    <View style={{ height: '100%' }}>
      <RouterBehaviors />
      <GlobalKeys />
      <CommandBar />
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
                    isAccountsFetching || !accounts ? (
                      <LoadingIndicator />
                    ) : accounts.length > 0 ? (
                      <Navigate to="/budget" replace />
                    ) : (
                      // If there are no accounts, we want to redirect the user to
                      // the All Accounts screen which will prompt them to add an account
                      <Navigate to="/accounts" replace />
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
                  element={<NarrowAlternate name="Schedules" />}
                />
                <Route
                  path="/schedules/:id"
                  element={
                    <WideNotSupported>
                      <NarrowAlternate name="ScheduleEdit" />
                    </WideNotSupported>
                  }
                />

                <Route
                  path="/payees"
                  element={<NarrowAlternate name="Payees" />}
                />
                <Route
                  path="/payees/:id"
                  element={
                    <WideNotSupported>
                      <NarrowAlternate name="PayeeEdit" />
                    </WideNotSupported>
                  }
                />
                <Route
                  path="/rules"
                  element={<NarrowAlternate name="Rules" />}
                />
                <Route
                  path="/rules/:id"
                  element={<NarrowAlternate name="RuleEdit" />}
                />
                <Route
                  path="/bank-sync"
                  element={<NarrowAlternate name="BankSync" />}
                />
                <Route
                  path="/bank-sync/account/:accountId/edit"
                  element={
                    <WideNotSupported redirectTo="/bank-sync">
                      <MobileBankSyncAccountEditPage />
                    </WideNotSupported>
                  }
                />
                <Route path="/tags" element={<ManageTagsPage />} />
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
                  element={<NarrowAlternate name="Category" />}
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
                        validateOwner
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
              <Route path="/reports/:dashboardId" element={<MobileNavTabs />} />
              <Route path="/bank-sync" element={<MobileNavTabs />} />
              <Route path="/rules" element={<MobileNavTabs />} />
              <Route path="/payees" element={<MobileNavTabs />} />
              <Route path="/schedules" element={<MobileNavTabs />} />
              <Route path="*" element={null} />
            </Routes>
          </ScrollProvider>
        </View>
      </View>
    </View>
  );
}
