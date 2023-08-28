import React, { useEffect, useState } from 'react';
import {
  ErrorBoundary,
  useErrorBoundary,
  type FallbackProps,
} from 'react-error-boundary';
import { useSelector } from 'react-redux';

import * as Platform from 'loot-core/src/client/platform';
import {
  init as initConnection,
  send,
} from 'loot-core/src/platform/client/fetch';
import { type GlobalPrefs } from 'loot-core/src/types/prefs';

import { useActions } from '../hooks/useActions';
import installPolyfills from '../polyfills';
import { ResponsiveProvider } from '../ResponsiveProvider';
import { styles, hasHiddenScrollbars, ThemeStyle } from '../style';

import AppBackground from './AppBackground';
import View from './common/View';
import DevelopmentTopBar from './DevelopmentTopBar';
import FatalError from './FatalError';
import FinancesApp from './FinancesApp';
import ManagementApp from './manager/ManagementApp';
import MobileWebMessage from './MobileWebMessage';
import UpdateNotification from './UpdateNotification';

type AppProps = {
  budgetId: string;
  cloudFileId: string;
  loadingText: string;
  loadBudget: (
    id: string,
    loadingText?: string,
    options?: object,
  ) => Promise<void>;
  closeBudget: () => Promise<void>;
  loadGlobalPrefs: () => Promise<GlobalPrefs>;
};

function App({
  budgetId,
  cloudFileId,
  loadingText,
  loadBudget,
  closeBudget,
  loadGlobalPrefs,
}: AppProps) {
  const [initializing, setInitializing] = useState(true);
  const { showBoundary: showErrorBoundary } = useErrorBoundary();

  async function init() {
    const socketName = await global.Actual.getServerSocket();

    await initConnection(socketName);

    // Load any global prefs
    await loadGlobalPrefs();

    // Open the last opened budget, if any
    const budgetId = await send('get-last-opened-backup');
    if (budgetId) {
      await loadBudget(budgetId);

      // Check to see if this file has been remotely deleted (but
      // don't block on this in case they are offline or something)
      send('get-remote-files').then(files => {
        if (files) {
          let remoteFile = files.find(f => f.fileId === cloudFileId);
          if (remoteFile && remoteFile.deleted) {
            closeBudget();
          }
        }
      });
    }
  }

  useEffect(() => {
    async function initAll() {
      await Promise.all([installPolyfills(), init()]);
      setInitializing(false);
    }

    initAll().catch(showErrorBoundary);
  }, []);

  useEffect(() => {
    global.Actual.updateAppMenu(!!budgetId);
  }, [budgetId]);

  return (
    <>
      {initializing ? (
        <AppBackground initializing={initializing} loadingText={loadingText} />
      ) : budgetId ? (
        <FinancesApp />
      ) : (
        <>
          <AppBackground
            initializing={initializing}
            loadingText={loadingText}
          />
          <ManagementApp isLoading={loadingText != null} />
        </>
      )}

      <UpdateNotification />
      <MobileWebMessage />
    </>
  );
}

function ErrorFallback({ error }: FallbackProps) {
  return (
    <>
      <AppBackground />
      <FatalError error={error} buttonText="Restart app" />
    </>
  );
}

function AppWrapper() {
  let budgetId = useSelector(
    state => state.prefs.local && state.prefs.local.id,
  );
  let cloudFileId = useSelector(
    state => state.prefs.local && state.prefs.local.cloudFileId,
  );
  let loadingText = useSelector(state => state.app.loadingText);
  let { loadBudget, closeBudget, loadGlobalPrefs, sync } = useActions();
  const [hiddenScrollbars, setHiddenScrollbars] = useState(
    hasHiddenScrollbars(),
  );

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
        await sync();
        isSyncing = false;
      }
    }

    window.addEventListener('focus', checkScrollbars);
    window.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      window.removeEventListener('focus', checkScrollbars);
      window.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [sync]);

  return (
    <ResponsiveProvider>
      <View
        style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
      >
        <View
          key={hiddenScrollbars ? 'hidden-scrollbars' : 'scrollbars'}
          style={{
            flexGrow: 1,
            overflow: 'hidden',
            ...styles.lightScrollbar,
          }}
        >
          <ErrorBoundary FallbackComponent={ErrorFallback}>
            {process.env.REACT_APP_REVIEW_ID && !Platform.isPlaywright && (
              <DevelopmentTopBar />
            )}
            <App
              budgetId={budgetId}
              cloudFileId={cloudFileId}
              loadingText={loadingText}
              loadBudget={loadBudget}
              closeBudget={closeBudget}
              loadGlobalPrefs={loadGlobalPrefs}
            />
          </ErrorBoundary>
          <ThemeStyle />
        </View>
      </View>
    </ResponsiveProvider>
  );
}

export default AppWrapper;
