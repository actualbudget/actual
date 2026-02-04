import React, { useState, type ReactNode } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Block } from '@actual-app/components/block';
import { Button } from '@actual-app/components/button';
import { Paragraph } from '@actual-app/components/paragraph';
import { SpaceBetween } from '@actual-app/components/space-between';
import { Text } from '@actual-app/components/text';
import { View } from '@actual-app/components/view';

import { LazyLoadFailedError } from 'loot-core/shared/errors';

import { Link } from './common/Link';
import { Modal, ModalHeader } from './common/Modal';
import { Checkbox } from './forms';

import { useModalState } from '@desktop-client/hooks/useModalState';

type AppError = Error & {
  type?: string;
  IDBFailure?: boolean;
  SharedArrayBufferMissing?: boolean;
  BackendInitFailure?: boolean;
};

type FatalErrorProps = {
  error: Error | AppError;
};

type RenderSimpleProps = FatalErrorProps;

function RenderSimple({ error }: RenderSimpleProps) {
  let msg: ReactNode;

  if ('IDBFailure' in error && error.IDBFailure) {
    // IndexedDB wasn't able to open the database
    msg = (
      <Text>
        <Trans>
          Your browser doesn't support IndexedDB in this environment, a feature
          that Actual requires to run. This might happen if you are in private
          browsing mode. Please try a different browser or turn off private
          browsing.
        </Trans>
      </Text>
    );
  } else if (
    'SharedArrayBufferMissing' in error &&
    error.SharedArrayBufferMissing
  ) {
    // SharedArrayBuffer isn't available
    msg = (
      <Text>
        <Trans>
          Actual requires access to <code>SharedArrayBuffer</code> in order to
          function properly. If you're seeing this error, either your browser
          does not support <code>SharedArrayBuffer</code>, or your server is not
          sending the appropriate headers, or you are not using HTTPS. See{' '}
          <Link
            variant="external"
            linkColor="muted"
            to="https://actualbudget.org/docs/troubleshooting/shared-array-buffer"
          >
            our troubleshooting documentation
          </Link>{' '}
          to learn more. <SharedArrayBufferOverride />
        </Trans>
      </Text>
    );
  } else {
    // This indicates the backend failed to initialize. Show the
    // user something at least so they aren't looking at a blank
    // screen
    msg = (
      <Text>
        <Trans>
          There was a problem loading the app in this browser version.
        </Trans>
      </Text>
    );
  }

  return (
    <SpaceBetween
      direction="vertical"
      style={{
        paddingBottom: 15,
        lineHeight: '1.5em',
        fontSize: 15,
      }}
    >
      <Text>{msg}</Text>
      <Text>
        <Trans>
          Please get{' '}
          <Link
            variant="external"
            linkColor="muted"
            to="https://actualbudget.org/contact"
          >
            in touch
          </Link>{' '}
          for support
        </Trans>
      </Text>
    </SpaceBetween>
  );
}

function RenderLazyLoadError() {
  return (
    <SpaceBetween
      direction="vertical"
      style={{
        paddingBottom: 15,
        lineHeight: '1.5em',
        fontSize: 15,
      }}
    >
      <Text>
        <Trans>
          There was a problem loading one of the chunks of the application.
          Please reload the page and try again. If the issue persists - there
          might be an issue with either your internet connection and/or the
          server where the app is hosted.
        </Trans>
      </Text>
    </SpaceBetween>
  );
}

function RenderUIError() {
  return (
    <>
      <Paragraph>
        <Trans>There was an unrecoverable error in the UI. Sorry!</Trans>
      </Paragraph>
      <Paragraph>
        <Trans>
          If this error persists, please get{' '}
          <Link variant="external" to="https://actualbudget.org/contact">
            in touch
          </Link>{' '}
          so it can be investigated.
        </Trans>
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
        <Trans>
          Actual uses <code>SharedArrayBuffer</code> to allow usage from
          multiple tabs at once and to ensure correct behavior when switching
          files. While it can run without access to
          <code>SharedArrayBuffer</code>, you may encounter data loss or notice
          multiple budget files being merged with each other.
        </Trans>
      </Paragraph>
      <label
        style={{ display: 'flex', alignItems: 'center', marginBottom: 10 }}
      >
        <Checkbox
          checked={understand}
          onChange={() => setUnderstand(!understand)}
        />{' '}
        <Trans>
          I understand the risks, run Actual in the unsupported fallback mode
        </Trans>
      </label>
      <Button
        isDisabled={!understand}
        onPress={() => {
          window.localStorage.setItem('SharedArrayBufferOverride', 'true');
          window.location.reload();
        }}
      >
        <Trans>Open Actual</Trans>
      </Button>
    </>
  ) : (
    <Link
      variant="text"
      onClick={() => setExpanded(true)}
      style={{ marginLeft: 5 }}
    >
      <Trans>Advanced options</Trans>
    </Link>
  );
}

export function FatalError({ error }: FatalErrorProps) {
  const { t } = useTranslation();

  const { modalStack } = useModalState();
  const lastModal = modalStack[modalStack.length - 1];

  const [showError, setShowError] = useState(false);

  const showSimpleRender = 'type' in error && error.type === 'app-init-failure';
  const isLazyLoadError = error instanceof LazyLoadFailedError;

  return (
    <Modal name={lastModal?.name ?? 'fatal-error'} isDismissable={false}>
      <ModalHeader
        title={isLazyLoadError ? t('Loading Error') : t('Fatal Error')}
      />
      <View
        style={{
          maxWidth: 500,
        }}
      >
        {isLazyLoadError ? (
          <RenderLazyLoadError />
        ) : showSimpleRender ? (
          <RenderSimple error={error} />
        ) : (
          <RenderUIError />
        )}

        <Paragraph>
          <Button onPress={() => window.Actual.relaunch()}>
            <Trans>Restart app</Trans>
          </Button>
        </Paragraph>
        <Paragraph isLast style={{ fontSize: 11 }}>
          <Link variant="text" onClick={() => setShowError(state => !state)}>
            <Trans>Show Error</Trans>
          </Link>
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
