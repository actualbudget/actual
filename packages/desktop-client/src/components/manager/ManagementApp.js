import React from 'react';
import { connect } from 'react-redux';
import { Switch, Redirect, Router, Route } from 'react-router-dom';

import { createBrowserHistory } from 'history';

import * as actions from 'loot-core/src/client/actions';
import { View, Text } from 'loot-design/src/components/common';
import BudgetList from 'loot-design/src/components/manager/BudgetList';
import { colors } from 'loot-design/src/style';
import tokens from 'loot-design/src/tokens';

import LoggedInUser from '../LoggedInUser';
import Notifications from '../Notifications';
import { useServerVersion } from '../ServerContext';

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
        [`@media (min-width: ${tokens.breakpoint_medium})`]: {
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

class ManagementApp extends React.Component {
  constructor(props) {
    super(props);
    this.mounted = true;
    this.history = createBrowserHistory();
    window.__history = this.history;
  }

  async componentDidMount() {
    // An action may have been triggered from outside, and we don't
    // want to override its loading message so we only show the
    // initial loader if there isn't already a message
    let alreadyLoading = this.props.loadingText != null;

    // Remember: this component is remounted every time the user
    // closes a budget. That's why we keep `managerHasInitialized` in
    // redux so that it persists across renders. This will show the
    // loading spinner on first run, but never again since we'll have
    // a cached list of files and can show them
    if (!this.props.managerHasInitialized) {
      if (!alreadyLoading) {
        this.props.setAppState({ loadingText: '' });
      }
    } else {
      // If it's not the first time rendering, immediately show the
      // modal since we should have cached data
      this.showModal();
    }

    let userData = await this.props.getUserData();
    if (userData) {
      await this.props.loadAllFiles();
    }

    // TODO: There is a race condition here. The user could perform an
    // action that starts loading in between where `alreadyLoading`
    // was captured and this would clear it. We really only want to
    // ever clear the initial loading screen, so we need a "loading
    // id" of some kind.
    this.props.setAppState({
      managerHasInitialized: true,
      ...(!alreadyLoading ? { loadingText: null } : null),
    });
  }

  componentWillUnmount() {
    this.mounted = false;
  }

  render() {
    let { files, userData, managerHasInitialized, loadingText } = this.props;

    if (!managerHasInitialized) {
      return null;
    }

    let isHidden = loadingText != null;

    return (
      <Router history={this.history}>
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

          {!isHidden && (
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
              {userData ? (
                <>
                  <Switch>
                    <Route
                      exact
                      path="/config-server"
                      component={ConfigServer}
                    />
                    <Route
                      exact
                      path="/change-password"
                      component={ChangePassword}
                    />
                    {files && files.length > 0 ? (
                      <Route exact path="/" component={BudgetList} />
                    ) : (
                      <Route exact path="/" component={WelcomeScreen} />
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
                      <Route exact path="/config-server" component={null} />
                      <Route
                        exact
                        path="/"
                        render={() => (
                          <LoggedInUser style={{ padding: '4px 7px' }} />
                        )}
                      />
                    </Switch>
                  </View>
                </>
              ) : (
                <Switch>
                  <Route exact path="/login" component={Login} />
                  <Route exact path="/error" component={Error} />
                  <Route exact path="/config-server" component={ConfigServer} />
                  <Route exact path="/bootstrap" component={Bootstrap} />
                  {/* Redirect all other pages to this route */}
                  <Route path="/" render={() => <Redirect to="/bootstrap" />} />
                </Switch>
              )}
            </View>
          )}

          <Switch>
            <Route exact path="/config-server" component={null} />
            <Route path="/" component={ServerURL} />
          </Switch>
          <Version />
        </View>
        <Modals history={this.history} />
      </Router>
    );
  }
}

export default connect(state => {
  let { modalStack } = state.modals;

  return {
    files: state.budgets.allFiles,
    userData: state.user.data,
    managerHasInitialized: state.app.managerHasInitialized,
    loadingText: state.app.loadingText,
    currentModals: modalStack.map(modal => modal.name),
  };
}, actions)(ManagementApp);
