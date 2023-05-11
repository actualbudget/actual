import React, { useEffect, useState } from 'react';
import { connect } from 'react-redux';
import { Switch, Redirect, Router, Route } from 'react-router-dom';

import { createBrowserHistory } from 'history';

import * as actions from 'loot-core/src/client/actions';

import { colors } from '../../style';
import tokens from '../../tokens';
import { View, Text } from '../common';
import LoggedInUser from '../LoggedInUser';
import Notifications from '../Notifications';
import { useServerVersion } from '../ServerContext';

import BudgetList from './BudgetList';
import ConfigServer from './ConfigServer';
import Modals from './Modals';
import ServerURL from './ServerURL';
import Bootstrap from './subscribe/Bootstrap';
import ChangePassword from './subscribe/ChangePassword';
import Error from './subscribe/Error';
import Login from './subscribe/Login';
import WelcomeScreen from './WelcomeScreen';

function Version() {
  const version = useServerVersion();

  return (
    <Text
      style={{
        color: colors.n7,
        ':hover': { color: colors.n2 },
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
      href={'https://actualbudget.github.io/docs/Release-Notes/'}
    >
      {`App: v${window.Actual.ACTUAL_VERSION} | Server: ${version}`}
    </Text>
  );
}

function ManagementApp({
  isLoading,
  files,
  userData,
  managerHasInitialized,
  setAppState,
  getUserData,
  loadAllFiles,
}) {
  const [history] = useState(createBrowserHistory);
  window.__history = history;

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
      let userData = await getUserData();
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
    <Router history={history}>
      <View style={{ height: '100%' }}>
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
                <Switch>
                  <Route exact path="/config-server">
                    <ConfigServer />
                  </Route>
                  <Route exact path="/change-password">
                    <ChangePassword />
                  </Route>
                  {files && files.length > 0 ? (
                    <Route exact path="/">
                      <BudgetList />
                    </Route>
                  ) : (
                    <Route exact path="/">
                      <WelcomeScreen />
                    </Route>
                  )}
                  {/* Redirect all other pages to this route */}
                  <Route path="/" render={() => <Redirect to="/" />} />
                </Switch>

                <View
                  style={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    padding: '6px 10px',
                    zIndex: 4000,
                  }}
                >
                  <Switch>
                    <Route exact path="/config-server" children={null} />
                    <Route exact path="/">
                      <LoggedInUser style={{ padding: '4px 7px' }} />
                    </Route>
                  </Switch>
                </View>
              </>
            ) : (
              <Switch>
                <Route exact path="/login">
                  <Login />
                </Route>
                <Route exact path="/error">
                  <Error />
                </Route>
                <Route exact path="/config-server">
                  <ConfigServer />
                </Route>
                <Route exact path="/bootstrap">
                  <Bootstrap />
                </Route>
                {/* Redirect all other pages to this route */}
                <Route path="/" render={() => <Redirect to="/bootstrap" />} />
              </Switch>
            )}
          </View>
        )}

        <Switch>
          <Route exact path="/config-server" children={null} />
          <Route path="/">
            <ServerURL />
          </Route>
        </Switch>
        <Version />
      </View>
      <Modals history={history} />
    </Router>
  );
}

export default connect(state => {
  let { modalStack } = state.modals;

  return {
    files: state.budgets.allFiles,
    userData: state.user.data,
    managerHasInitialized: state.app.managerHasInitialized,
    currentModals: modalStack.map(modal => modal.name),
  };
}, actions)(ManagementApp);
