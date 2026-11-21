import React, { useRef, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { AnimatedLoading } from '@actual-app/components/icons/AnimatedLoading';
import { Paragraph } from '@actual-app/components/paragraph';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { sendCatch } from '@actual-app/core/platform/client/connection';

import { Error, Warning } from '#components/alerts';
import { Link } from '#components/common/Link';
import { Modal, ModalCloseButton, ModalHeader } from '#components/common/Modal';
import { useTrueLayerStatus } from '#hooks/useTrueLayerStatus';
import { pushModal } from '#modals/modalsSlice';
import type { Modal as ModalType } from '#modals/modalsSlice';
import { useDispatch } from '#redux';

type TrueLayerExternalMsgModalProps = Extract<
  ModalType,
  { name: 'truelayer-external-msg' }
>['options'];

type LinkError = {
  code: 'unknown' | 'timeout';
  message?: string;
};

export function TrueLayerExternalMsgModal({
  onMoveExternal,
  onSuccess,
  onClose,
}: TrueLayerExternalMsgModalProps) {
  const { t } = useTranslation();
  const dispatch = useDispatch();

  const [waiting, setWaiting] = useState<'browser' | 'accounts' | null>(null);
  const [error, setError] = useState<LinkError | null>(null);
  const [isSetupComplete, setIsSetupComplete] = useState(false);
  const { configuredTrueLayer, isLoading } = useTrueLayerStatus();

  const stateRef = useRef<string | null>(null);
  const jumpIdRef = useRef(0);

  async function stopPolling() {
    if (stateRef.current !== null) {
      await sendCatch('truelayer-poll-auth-stop', { state: stateRef.current });
    }
  }

  async function handleClose() {
    await stopPolling();
    onClose?.();
  }

  async function onJump() {
    const jumpId = ++jumpIdRef.current;
    await stopPolling();

    try {
      setError(null);
      setWaiting('browser');

      const res = await onMoveExternal(state => {
        if (jumpId === jumpIdRef.current) {
          stateRef.current = state;
        }
      });

      if (jumpId !== jumpIdRef.current) return;

      if ('error' in res) {
        setError({
          code: res.error,
          message: 'message' in res ? res.message : undefined,
        });
        setWaiting(null);
        return;
      }

      setWaiting('accounts');
      await onSuccess(res.data);
      if (jumpId !== jumpIdRef.current) return;
      setWaiting(null);
    } finally {
      if (jumpId === jumpIdRef.current) {
        stateRef.current = null;
      }
    }
  }

  const onTrueLayerInit = () => {
    dispatch(
      pushModal({
        modal: {
          name: 'truelayer-init',
          options: {
            onSuccess: () => setIsSetupComplete(true),
          },
        },
      }),
    );
  };

  return (
    <Modal
      name="truelayer-external-msg"
      onClose={handleClose}
      containerProps={{ style: { width: '30vw' } }}
    >
      {({ state }) => (
        <>
          <ModalHeader
            title={t('Link Your Bank')}
            rightContent={<ModalCloseButton onPress={() => state.close()} />}
          />
          <View>
            <Paragraph style={{ fontSize: 15 }}>
              <Trans>
                To link your bank account, you will be redirected to a new page
                where TrueLayer will ask you to choose your bank and approve
                read-only access. TrueLayer will not be able to withdraw funds
                from your accounts.
              </Trans>
            </Paragraph>

            {error && (
              <Error style={{ alignSelf: 'center', marginBottom: 10 }}>
                {error.code === 'timeout'
                  ? t('Timed out. Please try again.')
                  : t(
                      'An error occurred while linking your account, sorry! The potential issue could be: {{ message }}',
                      { message: error.message },
                    )}
              </Error>
            )}

            {waiting || isLoading ? (
              <View style={{ alignItems: 'center', marginTop: 15 }}>
                <AnimatedLoading
                  color={theme.pageTextDark}
                  style={{ width: 20, height: 20 }}
                />
                <View style={{ marginTop: 10, color: theme.pageText }}>
                  {isLoading
                    ? t('Checking TrueLayer configuration...')
                    : waiting === 'browser'
                      ? t('Waiting on TrueLayer...')
                      : t('Loading accounts...')}
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
            ) : configuredTrueLayer || isSetupComplete ? (
              <View style={{ gap: 10 }}>
                <Warning>
                  <Trans>
                    By enabling bank sync, you will be granting TrueLayer (a
                    third party service) read-only access to your accounts'
                    balances and transaction history. This service is not
                    affiliated with Actual in any way. Make sure you've read and
                    understand TrueLayer's{' '}
                    <Link
                      variant="external"
                      to="https://truelayer.com/legal/privacy/"
                      linkColor="purple"
                    >
                      Privacy Policy
                    </Link>{' '}
                    before proceeding.
                  </Trans>
                </Warning>

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
