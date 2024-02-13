// @ts-strict-ignore
import React, { useEffect, useState } from 'react';
import {
  ErrorBoundary,
  useErrorBoundary,
  type FallbackProps,
} from 'react-error-boundary';
import { useSelector } from 'react-redux';

import * as Platform from 'loot-core/src/client/platform';
import { type State } from 'loot-core/src/client/state-types';
import {
  init as initConnection,
  send,
} from 'loot-core/src/platform/client/fetch';

import { useActions } from '../hooks/useActions';
import { useLocalPref } from '../hooks/useLocalPref';
import { installPolyfills } from '../polyfills';
import { ResponsiveProvider } from '../ResponsiveProvider';
import { styles, hasHiddenScrollbars, ThemeStyle } from '../style';

import { AppBackground } from './AppBackground';
import { View } from './common/View';
import { DevelopmentTopBar } from './DevelopmentTopBar';
import { FatalError } from './FatalError';
import { FinancesApp } from './FinancesApp';
import { ManagementApp } from './manager/ManagementApp';
import { MobileWebMessage } from './MobileWebMessage';
import { UpdateNotification } from './UpdateNotification';

type AppInnerProps = {
  budgetId: string;
  cloudFileId: string;
};

function AppInner({ budgetId, cloudFileId }: AppInnerProps) {
  const [initializing, setInitializing] = useState(true);
  const { showBoundary: showErrorBoundary } = useErrorBoundary();
  const loadingText = useSelector((state: State) => state.app.loadingText);
  const { loadBudget, closeBudget, loadGlobalPrefs } = useActions();

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
          const remoteFile = files.find(f => f.fileId === cloudFileId);
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

export function App() {
  const [budgetId] = useLocalPref('id');
  const [cloudFileId] = useLocalPref('cloudFileId');
  const { sync } = useActions();
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
            <AppInner budgetId={budgetId} cloudFileId={cloudFileId} />
          </ErrorBoundary>
          <ThemeStyle />
        </View>
      </View>
    </ResponsiveProvider>
  );
}
