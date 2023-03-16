import React from 'react';
import { withRouter } from 'react-router-dom';

import * as Platform from 'loot-core/src/client/platform';

class GlobalKeys extends React.Component {
  componentDidMount() {
    const handleKeys = e => {
      if (Platform.isBrowser) {
        return;
      }

      if (e.metaKey) {
        const { history } = this.props;
        switch (e.code) {
          case 'Digit1':
            history.push('/budget');
            break;
          case 'Digit2':
            history.push('/reports');
            break;
          case 'Digit3':
            history.push('/accounts');
            break;
          case 'Comma':
            if (Platform.OS === 'mac') {
              history.push('/settings');
            }
            break;
          default:
        }
      }
    };

    document.addEventListener('keydown', handleKeys);

    this.cleanupListeners = () => {
      document.removeEventListener('keydown', handleKeys);
    };
  }

  componentWillUnmount() {
    this.cleanupListeners();
  }

  render() {
    return null;
  }
}

export default withRouter(GlobalKeys);
