import React, { useEffect, useEffectEvent, useRef, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button, ButtonWithLoading } from '@actual-app/components/button';
import { AnimatedLoading } from '@actual-app/components/icons/AnimatedLoading';
import { Input } from '@actual-app/components/input';
import { Select } from '@actual-app/components/select';
import { Text } from '@actual-app/components/text';
import { View } from '@actual-app/components/view';
import { send } from '@actual-app/core/platform/client/connection';
import type {
  FinTSAuthInput,
  FinTSAuthState,
} from '@actual-app/core/types/models';

import { Error as ErrorAlert, Warning } from '#components/alerts';
import {
  Modal,
  ModalButtons,
  ModalCloseButton,
  ModalHeader,
} from '#components/common/Modal';
import { Checkbox, FormField, FormLabel } from '#components/forms';
import { popModal } from '#modals/modalsSlice';
import type { Modal as ModalType } from '#modals/modalsSlice';
import { useDispatch } from '#redux';

type FinTSAuthModalProps = Extract<
  ModalType,
  { name: 'fints-auth' }
>['options'];

export function FinTSAuthModal({
  connectionId,
  connectionName,
  refresh,
  onComplete,
}: FinTSAuthModalProps) {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const [authState, setAuthState] = useState<FinTSAuthState | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [pin, setPin] = useState('');
  const [storePin, setStorePin] = useState(false);
  const [tan, setTan] = useState('');
  const [tanMethodId, setTanMethodId] = useState<number | null>(null);
  const [tanMediaName, setTanMediaName] = useState<string | null>(null);
  // Set once the outcome was reported, so closing the modal afterwards does
  // not report a cancellation as well.
  const isCompletedRef = useRef(false);

  async function advance(input: Omit<FinTSAuthInput, 'connectionId'>) {
    setIsBusy(true);
    const result = await send('fints-auth', { connectionId, ...input });
    setIsBusy(false);

    if ('error' in result) {
      setAuthState({
        state: 'error',
        code: result.error,
        message: result.reason,
      });
      return;
    }
    if ('error_code' in result) {
      setAuthState({ state: 'error', code: String(result.error_code) });
      return;
    }

    setAuthState(result);
    setTan('');
    if (result.state === 'ready' && !isCompletedRef.current) {
      isCompletedRef.current = true;
      onComplete(true);
      dispatch(popModal());
    }
  }

  function onClose() {
    if (isCompletedRef.current) {
      return;
    }
    isCompletedRef.current = true;
    void send('fints-auth', { connectionId, cancel: true });
    onComplete(false);
  }

  // Only the first step starts automatically. The ref keeps a double-invoked
  // effect (strict mode) from asking the bank twice.
  const hasStartedRef = useRef(false);
  const start = useEffectEvent(() => {
    if (!hasStartedRef.current) {
      hasStartedRef.current = true;
      void advance({ refresh });
    }
  });
  useEffect(() => {
    start();
  }, []);

  // A decoupled TAN (e.g. pushTAN) is approved in the banking app; ask the
  // bank at the interval it requested whether that happened.
  const poll = useEffectEvent((tanReference: string) => {
    void advance({ tanReference });
  });
  useEffect(() => {
    if (authState?.state !== 'tan-required' || !authState.decoupled) {
      return;
    }
    const { tanReference, pollIntervalSeconds } = authState;
    const timer = setTimeout(
      () => poll(tanReference),
      pollIntervalSeconds * 1000,
    );
    return () => clearTimeout(timer);
  }, [authState]);

  return (
    <Modal
      name="fints-auth"
      onClose={onClose}
      containerProps={{ style: { width: 420 } }}
    >
      {({ state }) => (
        <>
          <ModalHeader
            title={t('Bank login')}
            rightContent={<ModalCloseButton onPress={() => state.close()} />}
          />
          <View style={{ display: 'flex', gap: 10 }}>
            {connectionName && (
              <Text style={{ fontWeight: 600 }}>{connectionName}</Text>
            )}
            {authState == null && (
              <View style={{ alignItems: 'center', gap: 10, padding: 10 }}>
                <AnimatedLoading style={{ width: 20, height: 20 }} />
                <Text>
                  <Trans>Contacting your bank…</Trans>
                </Text>
              </View>
            )}

            {authState?.state === 'pin-required' && (
              <>
                {authState.rejected ? (
                  <ErrorAlert>
                    <Trans>
                      Your bank rejected the login. Check your PIN carefully:
                      banks block online banking after a few wrong attempts.
                    </Trans>
                    {authState.message && (
                      <Text
                        style={{ display: 'block', whiteSpace: 'pre-wrap' }}
                      >
                        {authState.message}
                      </Text>
                    )}
                  </ErrorAlert>
                ) : (
                  <Text>
                    <Trans>Enter your online banking PIN to continue.</Trans>
                  </Text>
                )}
                <FormField>
                  <FormLabel title={t('PIN:')} htmlFor="fints-pin-field" />
                  <Input
                    id="fints-pin-field"
                    type="password"
                    autoComplete="off"
                    autoFocus
                    value={pin}
                    onChangeValue={setPin}
                    onEnter={() => pin && void advance({ pin, storePin })}
                  />
                </FormField>
                <View
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}
                >
                  <Checkbox
                    id="fints-store-pin"
                    checked={storePin}
                    onChange={() => setStorePin(!storePin)}
                  />
                  <label htmlFor="fints-store-pin">
                    <Trans>Remember PIN on the server</Trans>
                  </label>
                </View>
                {storePin && (
                  <Warning>
                    <Trans>
                      The PIN is stored unencrypted in the server database.
                      Anyone with access to the server files can read it.
                    </Trans>
                  </Warning>
                )}
              </>
            )}

            {authState?.state === 'tan-method-required' && (
              <FormField>
                <FormLabel
                  title={t('How do you want to approve requests?')}
                  htmlFor="fints-tan-method-field"
                />
                <Select
                  id="fints-tan-method-field"
                  options={authState.methods.map(
                    method => [method.id, method.name] as const,
                  )}
                  value={tanMethodId ?? authState.methods[0]?.id}
                  onChange={setTanMethodId}
                />
              </FormField>
            )}

            {authState?.state === 'tan-media-required' && (
              <FormField>
                <FormLabel
                  title={t('Which device do you want to use?')}
                  htmlFor="fints-tan-media-field"
                />
                <Select
                  id="fints-tan-media-field"
                  options={authState.media.map(
                    medium => [medium, medium] as const,
                  )}
                  value={tanMediaName ?? authState.media[0]}
                  onChange={setTanMediaName}
                />
              </FormField>
            )}

            {authState?.state === 'tan-required' && (
              <>
                {authState.challenge && (
                  <Text style={{ whiteSpace: 'pre-wrap' }}>
                    {authState.challenge}
                  </Text>
                )}
                {authState.photo && (
                  <img
                    alt={t('TAN challenge image')}
                    src={`data:${authState.photo.mimeType};base64,${authState.photo.data}`}
                    style={{ alignSelf: 'center', maxWidth: '100%' }}
                  />
                )}
                {authState.decoupled ? (
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 10,
                    }}
                  >
                    <AnimatedLoading style={{ width: 16, height: 16 }} />
                    <Text>
                      <Trans>
                        Approve the request in your banking app. This window
                        continues automatically.
                      </Trans>
                    </Text>
                  </View>
                ) : (
                  <FormField>
                    <FormLabel title={t('TAN:')} htmlFor="fints-tan-field" />
                    <Input
                      id="fints-tan-field"
                      autoComplete="one-time-code"
                      autoFocus
                      value={tan}
                      onChangeValue={setTan}
                      onEnter={() =>
                        tan &&
                        void advance({
                          tanReference: authState.tanReference,
                          tan,
                        })
                      }
                    />
                  </FormField>
                )}
              </>
            )}

            {authState?.state === 'error' && (
              <ErrorAlert>
                {getErrorMessage(t, authState.code)}
                {authState.message && (
                  <Text style={{ display: 'block', whiteSpace: 'pre-wrap' }}>
                    {authState.message}
                  </Text>
                )}
              </ErrorAlert>
            )}
          </View>

          <ModalButtons>
            {authState?.state === 'pin-required' && (
              <ButtonWithLoading
                variant="primary"
                isLoading={isBusy}
                isDisabled={!pin}
                onPress={() => void advance({ pin, storePin })}
              >
                <Trans>Log in</Trans>
              </ButtonWithLoading>
            )}

            {authState?.state === 'tan-method-required' && (
              <ButtonWithLoading
                variant="primary"
                isLoading={isBusy}
                onPress={() =>
                  void advance({
                    tanMethodId: tanMethodId ?? authState.methods[0]?.id,
                  })
                }
              >
                <Trans>Continue</Trans>
              </ButtonWithLoading>
            )}

            {authState?.state === 'tan-media-required' && (
              <ButtonWithLoading
                variant="primary"
                isLoading={isBusy}
                onPress={() =>
                  void advance({
                    tanMediaName: tanMediaName ?? authState.media[0],
                  })
                }
              >
                <Trans>Continue</Trans>
              </ButtonWithLoading>
            )}

            {authState?.state === 'tan-required' && !authState.decoupled && (
              <ButtonWithLoading
                variant="primary"
                isLoading={isBusy}
                isDisabled={!tan}
                onPress={() =>
                  void advance({ tanReference: authState.tanReference, tan })
                }
              >
                <Trans>Submit TAN</Trans>
              </ButtonWithLoading>
            )}

            {authState?.state === 'error' && (
              <>
                <Button onPress={() => state.close()}>
                  <Trans>Close</Trans>
                </Button>
                <ButtonWithLoading
                  variant="primary"
                  isLoading={isBusy}
                  style={{ marginLeft: 10 }}
                  onPress={() => void advance({})}
                >
                  <Trans>Try again</Trans>
                </ButtonWithLoading>
              </>
            )}
          </ModalButtons>
        </>
      )}
    </Modal>
  );
}

function getErrorMessage(t: (key: string) => string, code: string): string {
  switch (code) {
    case 'NOT_CONFIGURED':
      return t(
        'FinTS is not set up on this server. An admin needs to enter the FinTS product registration number.',
      );
    case 'CONNECTION_NOT_FOUND':
      return t('This bank login no longer exists. Add it again.');
    case 'BANK_URL_BLOCKED':
      return t('The server refused to contact this bank address.');
    case 'NO_TAN_METHOD':
      return t(
        'Your bank offers no TAN method for this login. Activate one in your online banking first.',
      );
    case 'TAN_REJECTED':
      return t('Your bank rejected the TAN. Try again with a new TAN.');
    case 'BANK_ERROR':
      return t('Your bank reported an error.');
    default:
      return t('Could not contact your bank. Try again later.');
  }
}
