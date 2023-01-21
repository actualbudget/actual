import React from 'react';
import { connect } from 'react-redux';

import { css } from 'glamor';

import * as actions from 'loot-core/src/client/actions';
import {
  init as initConnection,
  send
} from 'loot-core/src/platform/client/fetch';
import { styles, hasHiddenScrollbars } from 'loot-design/src/style';

import installPolyfills from '../polyfills';

import AppBackground from './AppBackground';
import FatalError from './FatalError';
import FinancesApp from './FinancesApp';
import ManagementApp from './manager/ManagementApp';
import MobileWebMessage from './MobileWebMessage';
import UpdateNotification from './UpdateNotification';

class App extends React.Component {
  state = {
    fatalError: null,
    initializing: true,
    hiddenScrollbars: hasHiddenScrollbars()
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
      <div
        key={hiddenScrollbars ? 'hidden-scrollbars' : 'scrollbars'}
        {...css([
          {
            height: '100%',
            backgroundColor: '#E8ECF0',
            overflow: 'hidden'
          },
          styles.lightScrollbar
        ])}
      >
        {fatalError ? (
          <React.Fragment>
            <AppBackground />
            <FatalError error={fatalError} buttonText="Restart app" />
          </React.Fragment>
        ) : initializing ? (
          <AppBackground
            initializing={initializing}
            loadingText={loadingText}
          />
        ) : budgetId ? (
          <FinancesApp />
        ) : (
          <React.Fragment>
            <AppBackground
              initializing={initializing}
              loadingText={loadingText}
            />
            <ManagementApp />
          </React.Fragment>
        )}

        <UpdateNotification />
        <MobileWebMessage />
      </div>
    );
  }
}

export default connect(
  state => ({
    budgetId: state.prefs.local && state.prefs.local.id,
    cloudFileId: state.prefs.local && state.prefs.local.cloudFileId,
    loadingText: state.app.loadingText
  }),
  actions
)(App);
