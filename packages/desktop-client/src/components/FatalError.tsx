// @ts-strict-ignore
import React, { useState } from 'react';

import { Block } from './common/Block';
import { Button } from './common/Button';
import { ExternalLink } from './common/ExternalLink';
import { Modal } from './common/Modal';
import { Paragraph } from './common/Paragraph';
import { Stack } from './common/Stack';
import { Text } from './common/Text';
import { View } from './common/View';
import { Checkbox } from './forms';

type AppError = Error & {
  type?: string;
  IDBFailure?: boolean;
  SharedArrayBufferMissing?: boolean;
};

type FatalErrorProps = {
  buttonText: string;
  error: Error | AppError;
};

type RenderSimpleProps = {
  error: Error | AppError;
};

function RenderSimple({ error }: RenderSimpleProps) {
  let msg;
  if ('IDBFailure' in error && error.IDBFailure) {
    // IndexedDB wasn't able to open the database
    msg = (
      <Text>
        Your browser doesn’t support IndexedDB in this environment, a feature
        that Actual requires to run. This might happen if you are in private
        browsing mode. Please try a different browser or turn off private
        browsing.
      </Text>
    );
  } else if (
    'SharedArrayBufferMissing' in error &&
    error.SharedArrayBufferMissing
  ) {
    // SharedArrayBuffer isn't available
    msg = (
      <Text>
        Actual requires access to <code>SharedArrayBuffer</code> in order to
        function properly. If you’re seeing this error, either your browser does
        not support <code>SharedArrayBuffer</code>, or your server is not
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
    <Stack
      style={{
        paddingBottom: 15,
        lineHeight: '1.5em',
        fontSize: 15,
      }}
    >
      <Text>{msg}</Text>
      <Text>
        Please get{' '}
        <ExternalLink linkColor="muted" to="https://actualbudget.org/contact">
          in touch
        </ExternalLink>{' '}
        for support
      </Text>
    </Stack>
  );
}

function RenderUIError() {
  return (
    <>
      <Paragraph>There was an unrecoverable error in the UI. Sorry!</Paragraph>
      <Paragraph>
        If this error persists, please get{' '}
        <ExternalLink to="https://actualbudget.org/contact">
          in touch
        </ExternalLink>{' '}
        so it can be investigated.
      </Paragraph>
    </>
  );
}

function SharedArrayBufferOverride() {
  const [expanded, setExpanded] = useState(false);
  const [understand, setUnderstand] = useState(false);

  return expanded ? (
    <>
      <Paragraph style={{ marginTop: 10 }}>
        Actual uses <code>SharedArrayBuffer</code> to allow usage from multiple
        tabs at once and to ensure correct behavior when switching files. While
        it can run without access to <code>SharedArrayBuffer</code>, you may
        encounter data loss or notice multiple budget files being merged with
        each other.
      </Paragraph>
      <label
        style={{ display: 'flex', alignItems: 'center', marginBottom: 10 }}
      >
        <Checkbox
          checked={understand}
          onChange={() => setUnderstand(!understand)}
        />{' '}
        I understand the risks, run Actual in the unsupported fallback mode
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
    <Button
      type="link"
      onClick={() => setExpanded(true)}
      style={{ marginLeft: 5 }}
    >
      Advanced options
    </Button>
  );
}

export function FatalError({ buttonText, error }: FatalErrorProps) {
  const [showError, setShowError] = useState(false);

  const showSimpleRender = 'type' in error && error.type === 'app-init-failure';

  return (
    <Modal isCurrent={true} showClose={false} title="Fatal Error">
      <View
        style={{
          maxWidth: 500,
        }}
      >
        {showSimpleRender ? <RenderSimple error={error} /> : <RenderUIError />}
        <Paragraph>
          <Button onClick={() => window.Actual?.relaunch()}>
            {buttonText}
          </Button>
        </Paragraph>
        <Paragraph isLast={true} style={{ fontSize: 11 }}>
          <Button type="link" onClick={() => setShowError(true)}>
            Show Error
          </Button>
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
        </Paragraph>
      </View>
    </Modal>
  );
}
