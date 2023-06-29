import React, { Component, useState } from 'react';

import { colors } from '../style';

import {
  View,
  Stack,
  Text,
  Block,
  Modal,
  P,
  LinkButton,
  Button,
  ExternalLink,
} from './common';
import { Checkbox } from './forms';

class FatalError extends Component {
  state = { showError: false };

  renderSimple(error) {
    let msg;
    if (error.IDBFailure) {
      // IndexedDB wasn't able to open the database
      msg = (
        <Text>
          Your browser doesn’t support IndexedDB in this environment, a feature
          that Actual requires to run. This might happen if you are in private
          browsing mode. Please try a different browser or turn off private
          browsing.
        </Text>
      );
    } else if (error.SharedArrayBufferMissing) {
      // SharedArrayBuffer isn't available
      msg = (
        <Text>
          Actual requires access to <code>SharedArrayBuffer</code> in order to
          function properly. If you’re seeing this error, either your browser
          does not support <code>SharedArrayBuffer</code>, or your server is not
          sending the appropriate headers, or you are not using HTTPS. See{' '}
          <ExternalLink
            linkColor="muted"
            to="https://actualbudget.org/docs/troubleshooting/shared-array-buffer"
          >
            our troubleshooting documentation
          </ExternalLink>{' '}
          to learn more. <SharedArrayBufferOverride />
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
          <ExternalLink
            linkColor="muted"
            to="https://github.com/actualbudget/releases"
          >
            download the desktop app
          </ExternalLink>
          .
        </Text>
      );
    }

    return (
      <View
        style={{
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
        }}
      >
        <Stack
          style={{
            paddingBottom: 100,
            maxWidth: 500,
            color: colors.r4,
            lineHeight: '1.5em',
            fontSize: 15,
          }}
        >
          <Text>{msg}</Text>
          <Text>
            Please get{' '}
            <ExternalLink
              linkColor="muted"
              to="https://actualbudget.org/contact"
            >
              in touch
            </ExternalLink>{' '}
            for support
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
            <P>There was an unrecoverable error in the UI. Sorry!</P>
            <P>
              If this error persists, please get{' '}
              <ExternalLink to="https://actualbudget.org/contact">
                in touch
              </ExternalLink>{' '}
              so it can be investigated.
            </P>
            <P>
              <Button onClick={() => window.Actual.relaunch()}>
                {buttonText}
              </Button>
            </P>
            <P isLast={true} style={{ fontSize: 11 }}>
              <LinkButton
                onClick={() => this.setState({ showError: true })}
                style={{ color: colors.p4 }}
              >
                Show Error
              </LinkButton>
              {showError && (
                <Block
                  style={{
                    marginTop: 5,
                    height: 100,
                    overflow: 'auto',
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

function SharedArrayBufferOverride() {
  let [expanded, setExpanded] = useState(false);
  let [understand, setUnderstand] = useState(false);

  return expanded ? (
    <>
      <P style={{ marginTop: 10 }}>
        Actual uses <code>SharedArrayBuffer</code> to allow usage from multiple
        tabs at once and to ensure correct behavior when switching files. While
        it can run without access to <code>SharedArrayBuffer</code>, you may
        encounter data loss or notice multiple budget files being merged with
        each other.
      </P>
      <label
        style={{ display: 'flex', alignItems: 'center', marginBottom: 10 }}
      >
        <Checkbox checked={understand} onChange={setUnderstand} /> I understand
        the risks, run Actual in the unsupported fallback mode
      </label>
      <Button
        disabled={!understand}
        onClick={() => {
          window.localStorage.setItem('SharedArrayBufferOverride', 'true');
          window.location.reload();
        }}
      >
        Open Actual
      </Button>
    </>
  ) : (
    <LinkButton
      onClick={() => setExpanded(true)}
      style={{
        color: `inherit !important`,
        marginLeft: 5,
        border: 'none !important',
        background: 'none !important',
        padding: '0 !important',
        textDecoration: 'underline !important',
        boxShadow: 'none !important',
        display: 'inline !important',
        font: 'inherit !important',
      }}
    >
      Advanced options
    </LinkButton>
  );
}
