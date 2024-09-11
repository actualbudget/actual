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
import { useDispatch } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';

import {
  closeBudget,
  loadBudget,
  loadGlobalPrefs,
  setAppState,
  sync,
} from 'loot-core/client/actions';
import { SpreadsheetProvider } from 'loot-core/client/SpreadsheetProvider';
import * as Platform from 'loot-core/src/client/platform';
import {
  init as initConnection,
  send,
} from 'loot-core/src/platform/client/fetch';

import { useMetadataPref } from '../hooks/useMetadataPref';
import { installPolyfills } from '../polyfills';
import { ResponsiveProvider } from '../ResponsiveProvider';
import { styles, hasHiddenScrollbars, ThemeStyle } from '../style';
import { ExposeNavigate } from '../util/router-tools';

import { AppBackground } from './AppBackground';
import { BudgetMonthCountProvider } from './budget/BudgetMonthCountContext';
import { View } from './common/View';
import { DevelopmentTopBar } from './DevelopmentTopBar';
import { FatalError } from './FatalError';
import { FinancesApp } from './FinancesApp';
import { ManagementApp } from './manager/ManagementApp';
import { Modals } from './Modals';
import { ScrollProvider } from './ScrollProvider';
import { SidebarProvider } from './sidebar/SidebarProvider';
import { UpdateNotification } from './UpdateNotification';

function AppInner() {
  const [budgetId] = useMetadataPref('id');
  const [cloudFileId] = useMetadataPref('cloudFileId');
  const { t } = useTranslation();
  const { showBoundary: showErrorBoundary } = useErrorBoundary();
  const dispatch = useDispatch();

  async function init() {
    const socketName = await global.Actual.getServerSocket();

    dispatch(
      setAppState({
        loadingText: t('Initializing the connection to the local database...'),
      }),
    );
    await initConnection(socketName);

    // Load any global prefs
    dispatch(
      setAppState({
        loadingText: t('Loading global preferences...'),
      }),
    );
    await dispatch(loadGlobalPrefs());

    // Open the last opened budget, if any
    dispatch(
      setAppState({
        loadingText: t('Opening last budget...'),
      }),
    );
    const budgetId = await send('get-last-opened-backup');
    if (budgetId) {
      await dispatch(loadBudget(budgetId));

      // Check to see if this file has been remotely deleted (but
      // don't block on this in case they are offline or something)
      dispatch(
        setAppState({
          loadingText: t('Retrieving remote files...'),
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
      dispatch(setAppState({ loadingText: null }));
    }

    initAll().catch(showErrorBoundary);
  }, []);

  useEffect(() => {
    global.Actual.updateAppMenu(budgetId);
  }, [budgetId]);

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
    <BrowserRouter>
      <ExposeNavigate />
      <HotkeysProvider initiallyActiveScopes={['*']}>
        <ResponsiveProvider>
          <SpreadsheetProvider>
            <SidebarProvider>
              <BudgetMonthCountProvider>
                <DndProvider backend={HTML5Backend}>
                  <ScrollProvider>
                    <View
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
                    </View>
                  </ScrollProvider>
                </DndProvider>
              </BudgetMonthCountProvider>
            </SidebarProvider>
          </SpreadsheetProvider>
        </ResponsiveProvider>
      </HotkeysProvider>
    </BrowserRouter>
  );
}
