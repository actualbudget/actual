// @ts-strict-ignore
import React, { useEffect, useState } from 'react';
import {
  ErrorBoundary,
  useErrorBoundary,
  type FallbackProps,
} from 'react-error-boundary';
import { HotkeysProvider } from 'react-hotkeys-hook';
import { useDispatch, useSelector } from 'react-redux';

import {
  closeBudget,
  loadBudget,
  loadGlobalPrefs,
  setAppState,
  sync,
} from 'loot-core/client/actions';
import * as Platform from 'loot-core/src/client/platform';
import { type State } from 'loot-core/src/client/state-types';
import {
  init as initConnection,
  send,
} from 'loot-core/src/platform/client/fetch';

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
import { MobileWebMessage } from './mobile/MobileWebMessage';
import { UpdateNotification } from './UpdateNotification';

type AppInnerProps = {
  budgetId: string;
  cloudFileId: string;
};

function AppInner({ budgetId, cloudFileId }: AppInnerProps) {
  const [initializing, setInitializing] = useState(true);
  const { showBoundary: showErrorBoundary } = useErrorBoundary();
  const loadingText = useSelector((state: State) => state.app.loadingText);
  const dispatch = useDispatch();

  async function init() {
    const socketName = await global.Actual.getServerSocket();

    dispatch(
      setAppState({
        loadingText: 'Initializing the connection to the local database...',
      }),
    );
    await initConnection(socketName);

    // Load any global prefs
    dispatch(
      setAppState({
        loadingText: 'Loading global preferences...',
      }),
    );
    await dispatch(loadGlobalPrefs());

    // Open the last opened budget, if any
    dispatch(
      setAppState({
        loadingText: 'Opening last budget...',
      }),
    );
    const budgetId = await send('get-last-opened-backup');
    if (budgetId) {
      await dispatch(loadBudget(budgetId, 'Loading the last budget file...'));

      // Check to see if this file has been remotely deleted (but
      // don't block on this in case they are offline or something)
      dispatch(
        setAppState({
          loadingText: 'Retrieving remote files...',
        }),
      );
      send('get-remote-files').then(files => {
        if (files) {
          const remoteFile = files.find(f => f.fileId === cloudFileId);
          if (remoteFile && remoteFile.deleted) {
            dispatch(closeBudget());
          }
        }
      });
    }
  }

  useEffect(() => {
    async function initAll() {
      await Promise.all([installPolyfills(), init()]);
      setInitializing(false);
      dispatch(
        setAppState({
          loadingText: null,
        }),
      );
    }

    initAll().catch(showErrorBoundary);
  }, []);

  useEffect(() => {
    global.Actual.updateAppMenu(budgetId);
  }, [budgetId]);

  return (
    <>
      {(initializing || !budgetId) && (
        <AppBackground initializing={initializing} loadingText={loadingText} />
      )}
      {!initializing &&
        (budgetId ? (
          <FinancesApp />
        ) : (
          <ManagementApp isLoading={loadingText != null} />
        ))}

      <UpdateNotification />
      <MobileWebMessage />
    </>
  );
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
  const [budgetId] = useLocalPref('id');
  const [cloudFileId] = useLocalPref('cloudFileId');
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
  }, [dispatch]);

  return (
    <HotkeysProvider initiallyActiveScopes={['*']}>
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
    </HotkeysProvider>
  );
}
