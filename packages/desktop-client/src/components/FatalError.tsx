import React, { useState } from 'react';
import type { ReactNode } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Block } from '@actual-app/components/block';
import { Button, ButtonWithLoading } from '@actual-app/components/button';
import { Paragraph } from '@actual-app/components/paragraph';
import { SpaceBetween } from '@actual-app/components/space-between';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { isElectron } from '@actual-app/core/shared/environment';
import { LazyLoadFailedError } from '@actual-app/core/shared/errors';

import { useModalState } from '#hooks/useModalState';

import { DirectoryDisplay } from './common/DirectoryDisplay';
import { Link } from './common/Link';
import { Modal, ModalHeader } from './common/Modal';
import { Checkbox } from './forms';

const DATA_FOLDER_DOCS_URL =
  'https://actualbudget.org/docs/troubleshooting/data-folder-access';

// Filesystem error codes that mean "the OS refused access" rather than "the
// location is missing or invalid".
const ACCESS_DENIED_CODES = ['EPERM', 'EACCES'];

type AppError = Error & {
  type?: string;
  IDBFailure?: boolean;
  SharedArrayBufferMissing?: boolean;
  BackendInitFailure?: boolean;
  DocumentDirFailure?: boolean;
  path?: string;
  code?: string;
};

type FatalErrorProps = {
  error: unknown;
};

type RenderSimpleProps = {
  error: Error | AppError;
};

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
  } else if ('BackendInitFailure' in error && error.BackendInitFailure) {
    msg = isElectron() ? (
      <Text>
        <Trans>
          Actual's backend process failed to start or stopped unexpectedly.
          Restart the app to try again; if the problem persists, please get{' '}
          <Link variant="external" to="https://actualbudget.org/contact">
            in touch
          </Link>{' '}
          so it can be investigated.
        </Trans>
      </Text>
    ) : (
      <Text>
        <Trans>
          Actual couldn't load a critical backend worker. Reload the page to try
          again; if the problem persists, do a hard refresh to clear any stale
          cached assets.
        </Trans>
      </Text>
    );
  } else {
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
    </SpaceBetween>
  );
}

type RenderDocumentDirErrorProps = {
  path?: string;
  code?: string;
};

function RenderDocumentDirError({ path, code }: RenderDocumentDirErrorProps) {
  const isAccessDenied = code ? ACCESS_DENIED_CODES.includes(code) : false;

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
          Actual couldn't access the folder where it stores your budget files:
        </Trans>
      </Text>
      {path && <DirectoryDisplay directory={path} />}
      {isAccessDenied ? (
        <Text>
          <Trans>
            Access to this folder was denied. This is usually caused by folder
            permissions, or by security software (such as ransomware protection
            or antivirus) blocking Actual. Allow Actual to use this folder, or
            choose a different folder below.
          </Trans>
        </Text>
      ) : (
        <Text>
          {code ? (
            <Trans>The system reported the error code {{ code }}. </Trans>
          ) : null}
          <Trans>
            Check that this location exists and that Actual is allowed to write
            to it, or choose a different folder below.
          </Trans>
        </Text>
      )}
      <Text>
        <Trans>
          See{' '}
          <Link variant="external" linkColor="muted" to={DATA_FOLDER_DOCS_URL}>
            our troubleshooting documentation
          </Link>{' '}
          for step-by-step instructions.
        </Trans>
      </Text>
    </SpaceBetween>
  );
}

/**
 * Lets the user pick a different budget data folder straight from the error
 * screen. The backend isn't running at this point, so the choice is saved by
 * the desktop app's main process and the app is relaunched.
 */
function ChooseDocumentDirButton() {
  const { t } = useTranslation();
  const [isChanging, setIsChanging] = useState(false);
  const [chooseError, setChooseError] = useState('');

  async function chooseDirectory() {
    setChooseError('');

    const chosenDirectories = await window.Actual.openFileDialog({
      properties: ['openDirectory'],
    });
    const chosenDirectory = chosenDirectories?.[0];
    if (!chosenDirectory) {
      return;
    }

    setIsChanging(true);
    try {
      await window.Actual.setDocumentDir(chosenDirectory);
      window.Actual.relaunch();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setChooseError(t("That folder can't be used: {{message}}", { message }));
      setIsChanging(false);
    }
  }

  return (
    <>
      <ButtonWithLoading
        variant="primary"
        isLoading={isChanging}
        onPress={chooseDirectory}
      >
        <Trans>Choose a different folder</Trans>
      </ButtonWithLoading>
      {chooseError && (
        <Text style={{ color: theme.errorText, flexBasis: '100%' }}>
          {chooseError}
        </Text>
      )}
    </>
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

export function FatalError({ error: rawError }: FatalErrorProps) {
  const { t } = useTranslation();

  const { modalStack } = useModalState();
  const lastModal = modalStack[modalStack.length - 1];

  const [showError, setShowError] = useState(false);

  const error: Error | AppError =
    rawError instanceof Error
      ? rawError
      : rawError && typeof rawError === 'object'
        ? // Plain message objects (e.g. app-init-failure payloads) stringify
          // to "[object Object]" — keep the real fields so bug reports carry
          // the actual cause.
          Object.assign(new Error(JSON.stringify(rawError)), rawError)
        : new Error(String(rawError));
  const isAppInitFailure = 'type' in error && error.type === 'app-init-failure';
  const isDocumentDirError =
    isAppInitFailure &&
    'DocumentDirFailure' in error &&
    Boolean(error.DocumentDirFailure);
  const documentDirPath =
    'path' in error && typeof error.path === 'string' ? error.path : undefined;
  const documentDirCode =
    'code' in error && typeof error.code === 'string' ? error.code : undefined;
  const isLazyLoadError = error instanceof LazyLoadFailedError;

  let title = t('Fatal Error');
  if (isLazyLoadError) {
    title = t('Loading Error');
  } else if (isDocumentDirError) {
    title = t('Data folder unavailable');
  }

  return (
    <Modal name={lastModal?.name ?? 'fatal-error'} isDismissable={false}>
      <ModalHeader title={title} />
      <View
        style={{
          maxWidth: 500,
        }}
      >
        {isLazyLoadError ? (
          <RenderLazyLoadError />
        ) : isDocumentDirError ? (
          <RenderDocumentDirError
            path={documentDirPath}
            code={documentDirCode}
          />
        ) : isAppInitFailure ? (
          <RenderSimple error={error} />
        ) : (
          <RenderUIError />
        )}

        <Paragraph>
          <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
            {isDocumentDirError && isElectron() && <ChooseDocumentDirButton />}
            <Button onPress={() => window.Actual.relaunch()}>
              <Trans>Restart app</Trans>
            </Button>
          </View>
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
