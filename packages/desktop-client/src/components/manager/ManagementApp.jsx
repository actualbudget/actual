import React, { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Navigate, BrowserRouter, Route, Routes } from 'react-router-dom';

import { useActions } from '../../hooks/useActions';
import { theme } from '../../style';
import { tokens } from '../../tokens';
import { ExposeNavigate } from '../../util/router-tools';
import { Text } from '../common/Text';
import { View } from '../common/View';
import { LoggedInUser } from '../LoggedInUser';
import { Notifications } from '../Notifications';
import { useServerVersion } from '../ServerContext';

import { BudgetList } from './BudgetList';
import { ConfigServer } from './ConfigServer';
import { Modals } from './Modals';
import { ServerURL } from './ServerURL';
import { Bootstrap } from './subscribe/Bootstrap';
import { ChangePassword } from './subscribe/ChangePassword';
import { Error } from './subscribe/Error';
import { Login } from './subscribe/Login';
import { WelcomeScreen } from './WelcomeScreen';

function Version() {
  const version = useServerVersion();

  return (
    <Text
      style={{
        color: theme.pageTextSubdued,
        ':hover': { color: theme.pageText },
        margin: 15,
        marginLeft: 17,
        [`@media (min-width: ${tokens.breakpoint_small})`]: {
          position: 'absolute',
          bottom: 0,
          right: 0,
          marginLeft: 15,
          marginRight: 17,
          zIndex: 5001,
        },
      }}
    >
      {`App: v${window.Actual?.ACTUAL_VERSION} | Server: ${version}`}
    </Text>
  );
}

export function ManagementApp({ isLoading }) {
  const files = useSelector(state => state.budgets.allFiles);
  const userData = useSelector(state => state.user.data);
  const managerHasInitialized = useSelector(
    state => state.app.managerHasInitialized,
  );

  const { setAppState, getUserData, loadAllFiles } = useActions();

  // runs on mount only
  useEffect(() => {
    // An action may have been triggered from outside, and we don't
    // want to override its loading message so we only show the
    // initial loader if there isn't already a message

    // Remember: this component is remounted every time the user
    // closes a budget. That's why we keep `managerHasInitialized` in
    // redux so that it persists across renders. This will show the
    // loading spinner on first run, but never again since we'll have
    // a cached list of files and can show them
    if (!managerHasInitialized) {
      if (!isLoading) {
        setAppState({ loadingText: '' });
      }
    }

    async function fetchData() {
      const userData = await getUserData();
      if (userData) {
        await loadAllFiles();
      }

      // TODO: There is a race condition here. The user could perform an
      // action that starts loading in between where `isLoading`
      // was captured and this would clear it. We really only want to
      // ever clear the initial loading screen, so we need a "loading
      // id" of some kind.
      setAppState({
        managerHasInitialized: true,
        ...(!isLoading ? { loadingText: null } : null),
      });
    }

    fetchData();
  }, []);

  if (!managerHasInitialized) {
    return null;
  }

  if (isLoading) {
    return null;
  }

  return (
    <BrowserRouter>
      <ExposeNavigate />
      <View style={{ height: '100%', color: theme.pageText }}>
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 40,
            WebkitAppRegion: 'drag',
          }}
        />
        <View
          style={{
            position: 'absolute',
            bottom: 40,
            right: 15,
          }}
        >
          <Notifications
            style={{
              position: 'relative',
              left: 'initial',
              right: 'initial',
            }}
          />
        </View>

        {managerHasInitialized && (
          <View
            style={{
              alignItems: 'center',
              bottom: 0,
              justifyContent: 'center',
              left: 0,
              padding: 20,
              position: 'absolute',
              right: 0,
              top: 0,
            }}
          >
            {userData && files ? (
              <>
                <Routes>
                  <Route path="/config-server" element={<ConfigServer />} />

                  <Route path="/change-password" element={<ChangePassword />} />
                  {files && files.length > 0 ? (
                    <Route path="/" element={<BudgetList />} />
                  ) : (
                    <Route path="/" element={<WelcomeScreen />} />
                  )}
                  {/* Redirect all other pages to this route */}
                  <Route path="/*" element={<Navigate to="/" />} />
                </Routes>

                <View
                  style={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    padding: '6px 10px',
                    zIndex: 4000,
                  }}
                >
                  <Routes>
                    <Route path="/config-server" element={null} />
                    <Route
                      path="/*"
                      element={
                        <LoggedInUser
                          hideIfNoServer
                          style={{ padding: '4px 7px' }}
                        />
                      }
                    />
                  </Routes>
                </View>
              </>
            ) : (
              <Routes>
                <Route path="/login/:method?" element={<Login />} />
                <Route path="/error" element={<Error />} />
                <Route path="/config-server" element={<ConfigServer />} />
                <Route path="/bootstrap" element={<Bootstrap />} />
                {/* Redirect all other pages to this route */}
                <Route
                  path="/*"
                  element={<Navigate to="/bootstrap" replace />}
                />
              </Routes>
            )}
          </View>
        )}

        <Routes>
          <Route path="/config-server" element={null} />
          <Route path="/*" element={<ServerURL />} />
        </Routes>
        <Version />
      </View>
      <Modals />
    </BrowserRouter>
  );
}
