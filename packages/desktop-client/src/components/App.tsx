// @ts-strict-ignore
import React, { useEffect, useState } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import {
  ErrorBoundary,
  useErrorBoundary,
  type FallbackProps,
} from 'react-error-boundary';
import { HotkeysProvider } from 'react-hotkeys-hook';
import { useTranslation } from 'react-i18next';
import { BrowserRouter } from 'react-router';

import { styles } from '@actual-app/components/styles';
import { View } from '@actual-app/components/view';

import { init as initConnection, send } from 'loot-core/platform/client/fetch';
import * as Platform from 'loot-core/shared/platform';
import type { GlobalPrefs } from 'loot-core/types/prefs';

import { AppBackground } from './AppBackground';
import { BudgetMonthCountProvider } from './budget/BudgetMonthCountContext';
import { DevelopmentTopBar } from './DevelopmentTopBar';
import { FatalError } from './FatalError';
import { FinancesApp } from './FinancesApp';
import { ManagementApp } from './manager/ManagementApp';
import { Modals } from './Modals';
import { SidebarProvider } from './sidebar/SidebarProvider';
import { UpdateNotification } from './UpdateNotification';

import { setAppState, sync } from '@desktop-client/app/appSlice';
import {
  closeBudget,
  loadBudget,
} from '@desktop-client/budgetfiles/budgetfilesSlice';
import { handleGlobalEvents } from '@desktop-client/global-events';
import { useMetadataPref } from '@desktop-client/hooks/useMetadataPref';
import { SpreadsheetProvider } from '@desktop-client/hooks/useSpreadsheet';
import { setI18NextLanguage } from '@desktop-client/i18n';
import { addNotification } from '@desktop-client/notifications/notificationsSlice';
import {
  ActualPluginsProvider,
  useActualPlugins,
} from '@desktop-client/plugin/ActualPluginsProvider';
import { installPolyfills } from '@desktop-client/polyfills';
import { loadGlobalPrefs } from '@desktop-client/prefs/prefsSlice';
import { useDispatch, useSelector, useStore } from '@desktop-client/redux';
import {
  hasHiddenScrollbars,
  ThemeStyle,
  useTheme,
} from '@desktop-client/style';
import { signOut } from '@desktop-client/users/usersSlice';
import { ExposeNavigate } from '@desktop-client/util/router-tools';

// Wait for VitePWA service worker to be ready
const waitForVitePWAServiceWorker = () => {
  return new Promise<void>(resolve => {
    if (!('serviceWorker' in navigator)) {
      resolve();
      return;
    }

    const timeout = setTimeout(() => resolve(), 5000);

    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'service-worker-ready') {
        clearTimeout(timeout);
        navigator.serviceWorker.removeEventListener('message', handleMessage);
        resolve();
      }
    };

    navigator.serviceWorker.addEventListener('message', handleMessage);

    // Fallback: If SW is already active, proceed
    if (navigator.serviceWorker.controller) {
      clearTimeout(timeout);
      navigator.serviceWorker.removeEventListener('message', handleMessage);
      resolve();
    }
  });
};

function AppInner() {
  const [budgetId] = useMetadataPref('id');
  const [cloudFileId] = useMetadataPref('cloudFileId');
  const { t } = useTranslation();
  const { showBoundary: showErrorBoundary } = useErrorBoundary();
  const dispatch = useDispatch();
  const userData = useSelector(state => state.user.data);
  const { refreshPluginStore } = useActualPlugins();

  useEffect(() => {
    setI18NextLanguage(null);
  }, []);

  // Listen for messages from service worker
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      // Only handle messages from service worker
      if (event.source instanceof ServiceWorker || event.ports?.length > 0) {
        if (event.data && event.data.type === 'plugin-files') {
          const { pluginUrl } = event.data.eventData;

          try {
            // Get plugin files from backend
            const files = await send('plugin-files', { pluginUrl });

            // Send response back through the MessagePort
            if (event.ports && event.ports[0]) {
              event.ports[0].postMessage(files || []);
            }
          } catch (error) {
            console.error('Error handling plugin-files request:', error);
            // Send error response
            if (event.ports && event.ports[0]) {
              event.ports[0].postMessage([]);
            }
          }
        }
      }
    };

    // Listen for messages on the window (service worker communicates via window.postMessage)
    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  useEffect(() => {
    const maybeUpdate = async <T,>(cb?: () => T): Promise<T> => {
      if (global.Actual.isUpdateReadyForDownload()) {
        dispatch(
          setAppState({
            loadingText: t('Downloading and applying update...'),
          }),
        );
        await global.Actual.applyAppUpdate();
      }
      return cb?.();
    };

    async function init() {
      const serverSocket = await maybeUpdate(() =>
        global.Actual.getServerSocket(),
      );

      dispatch(
        setAppState({
          loadingText: t(
            'Initializing the connection to the local database...',
          ),
        }),
      );
      await initConnection(serverSocket);

      // Load any global prefs
      dispatch(
        setAppState({
          loadingText: t('Loading global preferences...'),
        }),
      );
      const globalPrefsResult = await dispatch(loadGlobalPrefs());

      // Load plugins if enabled (now that global prefs are loaded)
      const globalPrefs = globalPrefsResult.payload as GlobalPrefs;
      if (globalPrefs?.plugins) {
        dispatch(
          setAppState({
            loadingText: t('Loading Plugins...'),
          }),
        );

        // Use VitePWA to refresh service worker for fresh start
        await window.Actual.refreshServiceWorker();
        await waitForVitePWAServiceWorker();

        await refreshPluginStore(undefined, true);
      }

      // Open the last opened budget, if any
      dispatch(
        setAppState({
          loadingText: t('Opening last budget...'),
        }),
      );
      const budgetId = await send('get-last-opened-backup');
      if (budgetId) {
        await dispatch(loadBudget({ id: budgetId }));

        // Check to see if this file has been remotely deleted (but
        // don't block on this in case they are offline or something)
        dispatch(
          setAppState({
            loadingText: t('Retrieving remote files...'),
          }),
        );

        const files = await send('get-remote-files');
        if (files) {
          const remoteFile = files.find(f => f.fileId === cloudFileId);
          if (remoteFile && remoteFile.deleted) {
            dispatch(closeBudget());
          }
        }

        await maybeUpdate();
      }
    }

    async function initAll() {
      await Promise.all([installPolyfills(), init()]);
      dispatch(setAppState({ loadingText: null }));
    }

    initAll().catch(showErrorBoundary);
    // Removed cloudFileId & t from dependencies to prevent hard crash when closing budget in Electron
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, showErrorBoundary]);

  useEffect(() => {
    global.Actual.updateAppMenu(budgetId);
  }, [budgetId]);

  useEffect(() => {
    if (userData?.tokenExpired) {
      dispatch(
        addNotification({
          notification: {
            type: 'error',
            id: 'login-expired',
            title: t('Login expired'),
            sticky: true,
            message: t('Login expired, please log in again.'),
            button: {
              title: t('Go to login'),
              action: () => {
                dispatch(signOut());
              },
            },
          },
        }),
      );
    }
  }, [dispatch, t, userData?.tokenExpired]);

  return budgetId ? <FinancesApp /> : <ManagementApp />;
}

function ErrorFallback({ error }: FallbackProps) {
  return (
    <>
      <AppBackground />
      <FatalError error={error} />
    </>
  );
}

export function App() {
  const store = useStore();

  useEffect(() => handleGlobalEvents(store), [store]);

  const [hiddenScrollbars, setHiddenScrollbars] = useState(
    hasHiddenScrollbars(),
  );
  const dispatch = useDispatch();

  useEffect(() => {
    function checkScrollbars() {
      if (hiddenScrollbars !== hasHiddenScrollbars()) {
        setHiddenScrollbars(hasHiddenScrollbars());
      }
    }

    let isSyncing = false;

    async function onVisibilityChange() {
      if (!isSyncing) {
        console.debug('triggering sync because of visibility change');
        isSyncing = true;
        await dispatch(sync());
        isSyncing = false;
      }
    }

    window.addEventListener('focus', checkScrollbars);
    window.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      window.removeEventListener('focus', checkScrollbars);
      window.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [dispatch, hiddenScrollbars]);

  const [theme] = useTheme();

  return (
    <BrowserRouter>
      <ActualPluginsProvider>
        <ExposeNavigate />
        <HotkeysProvider initiallyActiveScopes={['*']}>
          <SpreadsheetProvider>
            <SidebarProvider>
              <BudgetMonthCountProvider>
                <DndProvider backend={HTML5Backend}>
                  <View
                    data-theme={theme}
                    style={{
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    <View
                      key={
                        hiddenScrollbars ? 'hidden-scrollbars' : 'scrollbars'
                      }
                      style={{
                        flexGrow: 1,
                        overflow: 'hidden',
                        ...styles.lightScrollbar,
                      }}
                    >
                      <ErrorBoundary FallbackComponent={ErrorFallback}>
                        {process.env.REACT_APP_REVIEW_ID &&
                          !Platform.isPlaywright && <DevelopmentTopBar />}
                        <AppInner />
                      </ErrorBoundary>
                      <ThemeStyle />
                      <Modals />
                      <UpdateNotification />
                    </View>
                    <div id="plugin-sidebar-root" />
                  </View>
                </DndProvider>
              </BudgetMonthCountProvider>
            </SidebarProvider>
          </SpreadsheetProvider>
        </HotkeysProvider>
      </ActualPluginsProvider>
    </BrowserRouter>
  );
}
