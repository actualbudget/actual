import React from 'react';

import {
  View,
  Stack,
  Text,
  Block,
  Modal,
  P,
  Link,
  Button
} from 'loot-design/src/components/common';
import { colors } from 'loot-design/src/style';

class FatalError extends React.Component {
  state = { showError: false };

  renderSimple(error) {
    let msg;
    if (error.IDBFailure) {
      // IndexedDB wasn't able to open the database
      msg = (
        <Text>
          Your browser doesn{"'"}t support IndexedDB in this environment, a
          feature that Actual requires to run. This might happen if you are in
          private browsing mode. Please try a different browser or turn off
          private browsing.
        </Text>
      );
    } else {
      // This indicates the backend failed to initialize. Show the
      // user something at least so they aren't looking at a blank
      // screen
      msg = (
        <Text>
          There was a problem loading the app in this browser version. If this
          continues to be a problem, you can{' '}
          <a href="https://github.com/actualbudget/releases">
            download the desktop app
          </a>
          .
        </Text>
      );
    }

    return (
      <View
        style={{
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%'
        }}
      >
        <Stack
          style={{
            paddingBottom: 100,
            maxWidth: 500,
            color: colors.r4,
            lineHeight: '1.5em',
            fontSize: 15,
            '& a': { color: colors.r4 }
          }}
        >
          <Text>{msg}</Text>
          <Text>
            Contact{' '}
            <a href="mailto:help@actualbudget.com">help@actualbudget.com</a> for
            support
          </Text>
        </Stack>
      </View>
    );
  }

  render() {
    const { buttonText, error } = this.props;
    const { showError } = this.state;

    if (error.type === 'app-init-failure') {
      return this.renderSimple(error);
    }

    return (
      <Modal isCurrent={true} showClose={false} title="Fatal Error">
        {() => (
          <View style={{ maxWidth: 500 }}>
            <P>
              There was an unrecoverable error in the UI. Sorry! This error has
              been reported and hopefully will be fixed soon.
            </P>
            <P>
              If you want to talk about what happened or give any feedback, send
              an email to{' '}
              <a
                href="mailto:help@actualbudget.com"
                style={{ color: colors.p4 }}
              >
                help@actualbudget.com
              </a>
              .
            </P>
            <P>
              <Button onClick={() => window.Actual.relaunch()}>
                {buttonText}
              </Button>
            </P>
            <P isLast={true} style={{ fontSize: 11 }}>
              <Link
                onClick={() => this.setState({ showError: true })}
                style={{ color: colors.p4 }}
              >
                Show Error
              </Link>
              {showError && (
                <Block
                  style={{
                    marginTop: 5,
                    height: 100,
                    overflow: 'auto'
                  }}
                >
                  {error.stack}
                </Block>
              )}
            </P>
          </View>
        )}
      </Modal>
    );
  }
}
export default FatalError;
