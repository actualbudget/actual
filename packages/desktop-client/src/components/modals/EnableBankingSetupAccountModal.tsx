import { useEffect, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Paragraph } from '@actual-app/components/paragraph';
import { View } from '@actual-app/components/view';

import { send } from 'loot-core/platform/client/connection';
import type {
  EnableBankingAuthenticationStartResponse,
  EnableBankingErrorInterface,
  EnableBankingToken,
} from 'loot-core/types/models/enablebanking';

import { AspspSelector } from './EnableBankingSetupAccount/AspspSelector';
import { CompletedAuthorizationIndicator } from './EnableBankingSetupAccount/CompletedAuthorizationIndicator';
import { EnableBankingErrorAlert } from './EnableBankingSetupAccount/EnableBankingErrorAlert';
import { PollingComponent } from './EnableBankingSetupAccount/PollingComponent';
import { WaitingIndicator } from './EnableBankingSetupAccount/WaitingIndicator';

import {
  Modal,
  ModalCloseButton,
  ModalHeader,
} from '@desktop-client/components/common/Modal';
import { useEnableBankingStatus } from '@desktop-client/hooks/useEnableBankingStatus';
import { popModal, pushModal } from '@desktop-client/modals/modalsSlice';
import type { Modal as ModalType } from '@desktop-client/modals/modalsSlice';
import { useDispatch } from '@desktop-client/redux';

// Delay to allow modal close animation to complete before opening next modal.
// This prevents visual glitches when transitioning between modals.
const MODAL_TRANSITION_DELAY_MS = 100;

type EnableBankingSetupAccountModalProps = Extract<
  ModalType,
  { name: 'enablebanking-setup-account' }
>['options'];

export function EnableBankingSetupAccountModal({
  onSuccess,
  initialCountry = undefined,
  initialAspsp = undefined,
}: EnableBankingSetupAccountModalProps) {
  const { t } = useTranslation();
  const dispatch = useDispatch();

  const [error, setError] = useState<EnableBankingErrorInterface | null>(null);

  const { isLoading: isConfigurationLoading } = useEnableBankingStatus();

  // Ref to track timeout for reopening modal during credential error handling
  const reopenTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Stop polling when modal is unmounted
  useEffect(() => {
    const timeoutRef = reopenTimeoutRef;
    return () => {
      void send('enablebanking-stoppolling');
      // Clear reopen timeout if modal unmounts before timeout fires
      const timeout = timeoutRef.current;
      if (timeout) {
        clearTimeout(timeout);
      }
    };
  }, []);

  const [phase, setPhase] = useState<
    'checkingAvailable' | 'selectingAspsp' | 'polling' | 'done'
  >('checkingAvailable');
  const [authenticationStartResponse, setAuthenticationStartResponse] =
    useState<EnableBankingAuthenticationStartResponse | null>(null);
  const [token, setToken] = useState<EnableBankingToken | null>(null);

  const resetState = () => {
    setPhase('checkingAvailable');
    setAuthenticationStartResponse(null);
    setToken(null);
  };

  useEffect(() => {
    if (!isConfigurationLoading && phase === 'checkingAvailable') {
      setPhase('selectingAspsp');
    }
  }, [isConfigurationLoading, phase]);

  // Handle invalid state transitions
  useEffect(() => {
    if (phase === 'polling' && authenticationStartResponse === null) {
      setPhase('selectingAspsp');
    }
  }, [phase, authenticationStartResponse]);

  useEffect(() => {
    if (phase === 'done' && token === null) {
      setPhase('polling');
    }
  }, [phase, token]);

  let component: ReactElement | null = (
    <WaitingIndicator
      message={t('Checking if Enable Banking is available...')}
    />
  );

  switch (phase) {
    case 'selectingAspsp':
      component = (
        <AspspSelector
          initialCountry={initialCountry}
          initialAspsp={initialAspsp}
          onComplete={(response: EnableBankingAuthenticationStartResponse) => {
            setError(null);
            setAuthenticationStartResponse(response);
            setPhase('polling');
          }}
          onError={error => {
            // If credentials are not configured, close modal and redirect to setup
            if (
              error?.error_code === 'ENABLEBANKING_NOT_CONFIGURED' ||
              error?.error_code === 'ENABLEBANKING_APPLICATION_INACTIVE' ||
              error?.error_code === 'ENABLEBANKING_SECRETS_INVALID'
            ) {
              try {
                // Close this modal and open init modal
                dispatch(popModal());
                dispatch(
                  pushModal({
                    modal: {
                      name: 'enablebanking-init',
                      options: {
                        onSuccess: closeInitModal => {
                          // Close the init modal first
                          closeInitModal();
                          // Then open account selection modal with a brief delay
                          // Note: Cannot use parent's reopenTimeoutRef since parent modal is unmounted
                          setTimeout(() => {
                            try {
                              dispatch(
                                pushModal({
                                  modal: {
                                    name: 'enablebanking-setup-account',
                                    options: {
                                      onSuccess,
                                      initialCountry,
                                      initialAspsp,
                                    },
                                  },
                                }),
                              );
                            } catch (dispatchError) {
                              // If modal dispatch fails, show error to user
                              console.error(
                                'Failed to reopen setup modal:',
                                dispatchError,
                              );
                            }
                          }, MODAL_TRANSITION_DELAY_MS);
                        },
                      },
                    },
                  }),
                );
              } catch (dispatchError) {
                console.error('Failed to open init modal:', dispatchError);
                // Fallback: show error and reset state
                setError({
                  error_code: 'INTERNAL_ERROR',
                  error_type: 'Failed to open credential setup modal',
                });
                resetState();
              }
              return;
            }
            setError(error);
            resetState();
          }}
        />
      );
      break;
    case 'polling':
      if (authenticationStartResponse !== null) {
        component = (
          <PollingComponent
            authenticationStartResponse={authenticationStartResponse}
            onComplete={token => {
              setToken(token);
              setPhase('done');
            }}
            onError={error => {
              setError(error);
              resetState();
            }}
          />
        );
      }
      break;
    case 'done':
      // Will be constructed in render with access to close function
      component = null;
      break;
    default:
      break;
  }
  return (
    <Modal
      name="enablebanking-setup-account"
      containerProps={{ style: { width: '30vw' } }}
    >
      {({ state }) => {
        const closeModal = () => state.close();
        // Reconstruct component with access to close function
        let componentWithClose: ReactElement | null = component;

        if (phase === 'done' && token !== null) {
          const continueAuthorization = async () => {
            try {
              // Keep transition orchestration in onSuccess to avoid modal flicker/race conditions.
              await onSuccess(token);
            } catch (error) {
              setError({
                error_code: 'INTERNAL_ERROR',
                error_type:
                  error instanceof Error ? error.message : String(error),
              });
            }
          };

          componentWithClose = (
            <CompletedAuthorizationIndicator
              onContinue={continueAuthorization}
            />
          );
        }

        if (!componentWithClose) {
          componentWithClose = <WaitingIndicator message={t('Loading...')} />;
        }

        return (
          <>
            <ModalHeader
              title={t('Link Your Bank')}
              rightContent={<ModalCloseButton onPress={closeModal} />}
            />
            <View>
              {error && <EnableBankingErrorAlert error={error} />}
              <Paragraph style={{ fontSize: 15 }}>
                <Trans>
                  To link your bank account, you will be redirected to a new
                  page where Enable Banking will ask to connect to your bank.
                  Enable Banking will not be able to withdraw funds from your
                  accounts.
                </Trans>
              </Paragraph>
              {componentWithClose ?? (
                <WaitingIndicator message={t('Loading...')} />
              )}
            </View>
          </>
        );
      }}
    </Modal>
  );
}
