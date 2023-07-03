import React, { Component } from 'react';
import { connect } from 'react-redux';

import { css } from 'glamor';

import * as actions from 'loot-core/src/client/actions';
import {
  init as initConnection,
  send,
} from 'loot-core/src/platform/client/fetch';

import installPolyfills from '../polyfills';
import { ResponsiveProvider } from '../ResponsiveProvider';
import { styles, hasHiddenScrollbars, ThemeStyle } from '../style';

import AppBackground from './AppBackground';
import DevelopmentTopBar from './DevelopmentTopBar';
import FatalError from './FatalError';
import FinancesApp from './FinancesApp';
import ManagementApp from './manager/ManagementApp';
import MobileWebMessage from './MobileWebMessage';
import UpdateNotification from './UpdateNotification';

class App extends Component {
  state = {
    fatalError: null,
    initializing: true,
    hiddenScrollbars: hasHiddenScrollbars(),
  };

  async init() {
    const socketName = await global.Actual.getServerSocket();

    try {
      await initConnection(socketName);
    } catch (e) {
      if (e.type === 'app-init-failure') {
        this.setState({ initializing: false, fatalError: e });
        return;
      } else {
        throw e;
      }
    }

    // Load any global prefs
    await this.props.loadGlobalPrefs();

    // Open the last opened budget, if any
    const budgetId = await send('get-last-opened-backup');
    if (budgetId) {
      await this.props.loadBudget(budgetId);

      // Check to see if this file has been remotely deleted (but
      // don't block on this in case they are offline or something)
      send('get-remote-files').then(files => {
        if (files) {
          let remoteFile = files.find(f => f.fileId === this.props.cloudFileId);
          if (remoteFile && remoteFile.deleted) {
            this.props.closeBudget();
          }
        }
      });
    }
  }

  async componentDidMount() {
    await Promise.all([installPolyfills(), this.init()]);

    this.setState({ initializing: false });

    let checkScrollbars = () => {
      if (this.state.hiddenScrollbars !== hasHiddenScrollbars()) {
        this.setState({ hiddenScrollbars: hasHiddenScrollbars() });
      }
    };
    window.addEventListener('focus', checkScrollbars);
    this.cleanup = () => window.removeEventListener('focus', checkScrollbars);
  }

  componentDidCatch(error) {
    this.setState({ fatalError: error });
  }

  componentDidUpdate(prevProps) {
    if (this.props.budgetId !== prevProps.budgetId) {
      global.Actual.updateAppMenu(!!this.props.budgetId);
    }
  }

  render() {
    const { budgetId, loadingText } = this.props;
    const { fatalError, initializing, hiddenScrollbars } = this.state;
    return (
      <ResponsiveProvider>
        <div
          key={hiddenScrollbars ? 'hidden-scrollbars' : 'scrollbars'}
          {...css([
            {
              height: '100%',
              overflow: 'hidden',
            },
            styles.lightScrollbar,
          ])}
        >
          {process.env.REACT_APP_REVIEW_ID && <DevelopmentTopBar />}

          {fatalError ? (
            <>
              <AppBackground />
              <FatalError error={fatalError} buttonText="Restart app" />
            </>
          ) : initializing ? (
            <AppBackground
              initializing={initializing}
              loadingText={loadingText}
            />
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
        </div>
        <ThemeStyle theme={this.props.theme} />
      </ResponsiveProvider>
    );
  }
}

export default connect(
  state => ({
    budgetId: state.prefs.local && state.prefs.local.id,
    cloudFileId: state.prefs.local && state.prefs.local.cloudFileId,
    loadingText: state.app.loadingText,
    prefs: state.prefs,
    /* render() and init() run in parallel, 
    so no guarantee global prefs are loading
    in time for render() to use the theme */
    theme: state.prefs
      ? state.prefs.global
        ? state.prefs.global.theme
          ? state.prefs.global.theme
          : 'dark'
        : 'dark'
      : 'dark',
  }),
  actions,
)(App);
