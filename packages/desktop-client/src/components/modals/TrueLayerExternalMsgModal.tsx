import React, { useState, useRef } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { AnimatedLoading } from '@actual-app/components/icons/AnimatedLoading';
import { Paragraph } from '@actual-app/components/paragraph';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { type TrueLayerAuthSession } from 'loot-core/types/models';

import { Error } from '@desktop-client/components/alerts';
import { Link } from '@desktop-client/components/common/Link';
import {
  Modal,
  ModalCloseButton,
  ModalHeader,
} from '@desktop-client/components/common/Modal';
import { useTrueLayerStatus } from '@desktop-client/hooks/useTrueLayerStatus';
import {
  type Modal as ModalType,
  pushModal,
} from '@desktop-client/modals/modalsSlice';
import { useDispatch } from '@desktop-client/redux';

function renderError(
  error: { code: 'unknown' | 'timeout'; message?: string },
  t: ReturnType<typeof useTranslation>['t'],
) {
  return (
    <Error style={{ alignSelf: 'center', marginBottom: 10 }}>
      {error.code === 'timeout'
        ? t('Timed out. Please try again.')
        : t(
            'An error occurred while linking your account, sorry! The potential issue could be: {{ message }}',
            { message: error.message },
          )}
    </Error>
  );
}

type TrueLayerExternalMsgModalProps = Extract<
  ModalType,
  { name: 'truelayer-external-msg' }
>['options'];

export function TrueLayerExternalMsgModal({
  onMoveExternal,
  onSuccess,
  onClose,
}: TrueLayerExternalMsgModalProps) {
  const { t } = useTranslation();

  const dispatch = useDispatch();

  const [waiting, setWaiting] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [error, setError] = useState<{
    code: 'unknown' | 'timeout';
    message?: string;
  } | null>(null);
  const [isTrueLayerSetupComplete, setIsTrueLayerSetupComplete] = useState<
    boolean | null
  >(null);
  const data = useRef<TrueLayerAuthSession | null>(null);

  const {
    configuredTrueLayer: isConfigured,
    isLoading: isConfigurationLoading,
  } = useTrueLayerStatus();

  async function onJump() {
    setError(null);
    setWaiting('browser');

    const res = await onMoveExternal();
    if ('error' in res) {
      setError({
        code: res.error,
        message: 'message' in res ? res.message : undefined,
      });
      setWaiting(null);
      return;
    }

    data.current = res.data;
    setWaiting(null);
    setSuccess(true);
  }

  async function onContinue() {
    if (!data.current) {
      return;
    }
    setWaiting('accounts');
    await onSuccess(data.current);
    setWaiting(null);
  }

  const onTrueLayerInit = () => {
    dispatch(
      pushModal({
        modal: {
          name: 'truelayer-init',
          options: {
            onSuccess: () => setIsTrueLayerSetupComplete(true),
          },
        },
      }),
    );
  };

  const renderLinkButton = () => {
    return (
      <View style={{ gap: 10 }}>
        <Paragraph>
          <Trans>
            TrueLayer will ask you to select your bank and authorize access to
            your accounts.
          </Trans>
        </Paragraph>

        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
          <Button
            variant="primary"
            autoFocus
            style={{
              padding: '10px 0',
              fontSize: 15,
              fontWeight: 600,
              flexGrow: 1,
            }}
            onPress={onJump}
          >
            <Trans>Link bank in browser</Trans> &rarr;
          </Button>
        </View>
      </View>
    );
  };

  return (
    <Modal
      name="truelayer-external-msg"
      onClose={onClose}
      containerProps={{ style: { width: '30vw' } }}
    >
      {({ state: { close } }) => (
        <>
          <ModalHeader
            title={t('Link Your Bank')}
            rightContent={<ModalCloseButton onPress={close} />}
          />
          <View>
            <Paragraph style={{ fontSize: 15 }}>
              <Trans>
                To link your bank account, you will be redirected to a new page
                where TrueLayer will ask to connect to your bank. TrueLayer will
                not be able to withdraw funds from your accounts.
              </Trans>
            </Paragraph>

            {error && renderError(error, t)}

            {waiting || isConfigurationLoading ? (
              <View style={{ alignItems: 'center', marginTop: 15 }}>
                <AnimatedLoading
                  color={theme.pageTextDark}
                  style={{ width: 20, height: 20 }}
                />
                <View style={{ marginTop: 10, color: theme.pageText }}>
                  {isConfigurationLoading
                    ? t('Checking TrueLayer configuration...')
                    : waiting === 'browser'
                      ? t('Waiting on TrueLayer...')
                      : waiting === 'accounts'
                        ? t('Loading accounts...')
                        : null}
                </View>

                {waiting === 'browser' && (
                  <Link
                    variant="text"
                    onClick={onJump}
                    style={{ marginTop: 10 }}
                  >
                    (
                    <Trans>
                      Account linking not opening in a new tab? Click here
                    </Trans>
                    )
                  </Link>
                )}
              </View>
            ) : success ? (
              <Button
                variant="primary"
                autoFocus
                style={{
                  padding: '10px 0',
                  fontSize: 15,
                  fontWeight: 600,
                  marginTop: 10,
                }}
                onPress={onContinue}
              >
                <Trans>Success! Click to continue</Trans> &rarr;
              </Button>
            ) : isConfigured || isTrueLayerSetupComplete ? (
              renderLinkButton()
            ) : (
              <>
                <Paragraph style={{ color: theme.errorText }}>
                  <Trans>
                    TrueLayer integration has not yet been configured.
                  </Trans>
                </Paragraph>
                <Button variant="primary" onPress={onTrueLayerInit}>
                  <Trans>Configure TrueLayer integration</Trans>
                </Button>
              </>
            )}
          </View>
        </>
      )}
    </Modal>
  );
}
