import { useEffect, useRef, useState, type ReactElement } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button, ButtonWithLoading } from '@actual-app/components/button';
import { AnimatedLoading } from '@actual-app/components/icons/AnimatedLoading';
import { Paragraph } from '@actual-app/components/paragraph';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { send } from 'loot-core/platform/client/fetch';
import {
  type EnableBankingAuthenticationStartResponse,
  type EnableBankingBank,
  type EnableBankingErrorCode,
  type EnableBankingErrorInterface,
  type EnableBankingToken,
} from 'loot-core/types/models/enablebanking';

import {
  Error as ErrorAlert,
  Warning,
} from '@desktop-client/components/alerts';
import { Autocomplete } from '@desktop-client/components/autocomplete/Autocomplete';
import { Link } from '@desktop-client/components/common/Link';
import {
  Modal,
  ModalCloseButton,
  ModalHeader,
} from '@desktop-client/components/common/Modal';
import { FormField, FormLabel } from '@desktop-client/components/forms';
import { COUNTRY_OPTIONS } from '@desktop-client/components/util/countries';
import { useEnableBankingStatus } from '@desktop-client/hooks/useEnableBankingStatus';
import {
  popModal,
  pushModal,
  type Modal as ModalType,
} from '@desktop-client/modals/modalsSlice';
import { useDispatch } from '@desktop-client/redux';

function renderError(
  error: EnableBankingErrorInterface,
  t: ReturnType<typeof useTranslation>['t'],
) {
  const error_messages: Partial<Record<EnableBankingErrorCode, string>> = {
    TIME_OUT: t('Timed out. Please try again.'),
    ENABLEBANKING_APPLICATION_INACTIVE: t(
      'Your Enable Banking application is inactive. Please reconfigure.',
    ),
    ENABLEBANKING_NOT_CONFIGURED: t(
      'Enable Banking is not configured. Please set up your credentials first.',
    ),
    ENABLEBANKING_SECRETS_INVALID: t(
      'Enable Banking credentials are invalid. Please reconfigure.',
    ),
    INTERNAL_ERROR: t('An internal error occurred. Please try again.'),
  };

  return (
    <ErrorAlert style={{ alignSelf: 'center', marginBottom: 10 }}>
      {error.error_code in error_messages
        ? error_messages[error.error_code]
        : t(
            'An error occurred while linking your account, sorry! The potential issue could be: {{ message }}',
            { message: error.error_type },
          )}
    </ErrorAlert>
  );
}

const WaitingIndicator = ({ message }: { message: string }) => {
  return (
    <View style={{ alignItems: 'center', marginTop: 15 }}>
      <AnimatedLoading
        color={theme.pageTextDark}
        style={{ width: 20, height: 20 }}
      />
      <View style={{ marginTop: 10, color: theme.pageText }}>{message}</View>
    </View>
  );
};

// Delay to allow modal close animation to complete before opening next modal.
// This prevents visual glitches when transitioning between modals.
const MODAL_TRANSITION_DELAY_MS = 100;

const AspspSelector = ({
  init_country,
  init_aspsp,
  onComplete,
  onError,
}: {
  init_country?: string;
  init_aspsp?: string;
  onComplete: (data: EnableBankingAuthenticationStartResponse) => void;
  onError: (error: EnableBankingErrorInterface) => void;
}) => {
  const { t } = useTranslation();

  // Use refs to avoid infinite loops from callback dependencies
  const onErrorRef = useRef(onError);
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onErrorRef.current = onError;
    onCompleteRef.current = onComplete;
  }, [onError, onComplete]);

  const [availableCountries, setAvailableCountries] = useState<
    { id: string; name: string }[] | null
  >(null);
  const [availableAspsps, setAvailableAspsps] = useState<
    EnableBankingBank[] | null
  >(null);
  const [country, setCountry] = useState<{ id: string; name: string } | null>(
    COUNTRY_OPTIONS.find(country => country.id === init_country) ?? null,
  );
  const [aspsp, setAspsp] = useState<string | null>(
    init_aspsp ? init_aspsp : null,
  );
  const [startingAuth, setStartingAuth] = useState<boolean>(false);
  const autoTriggeredRef = useRef(false);

  // Auto-trigger authentication when both init values are provided (reauth scenario)
  useEffect(() => {
    if (
      init_country &&
      init_aspsp &&
      country &&
      aspsp &&
      !startingAuth &&
      !autoTriggeredRef.current
    ) {
      autoTriggeredRef.current = true;
      onLink();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [country, aspsp]); // Only trigger when country/aspsp are set

  useEffect(() => {
    let cancelled = false;
    // CodeRabbit suggested adding catchErrors: true, but this changes the response
    // structure and breaks TypeScript compatibility with existing error handling
    send('enablebanking-countries').then(({ data, error }) => {
      if (cancelled) return;
      // Handle error response
      if (error) {
        onErrorRef.current(error);
        return;
      }
      if (data) {
        const cids = new Set(data);
        const availableCountries = COUNTRY_OPTIONS.filter(val =>
          cids.has(val.id),
        );
        setAvailableCountries(availableCountries);
        return;
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (country) {
      let cancelled = false;
      // CodeRabbit suggested adding catchErrors: true, but this changes the response
      // structure and breaks TypeScript compatibility with existing error handling
      send('enablebanking-banks', { country: country.id }).then(
        ({ data, error }) => {
          if (cancelled) return;
          // Handle error response
          if (error) {
            onErrorRef.current(error);
            return;
          }
          if (data) {
            setAvailableAspsps(data);
            return;
          }
        },
      );
      return () => {
        cancelled = true;
      };
    }
  }, [country]);

  const onSelectCountry = (country_id: string) => {
    if (!country || country_id !== country.id) {
      setCountry(
        COUNTRY_OPTIONS.find(country => country.id === country_id) ?? null,
      );
      setAspsp(null);
      setAvailableAspsps(null);
    }
  };

  const onLink = async () => {
    if (country === null || aspsp === null) {
      onErrorRef.current({ error_code: 'INTERNAL_ERROR', error_type: '' });
      return;
    }
    setStartingAuth(true);
    try {
      const { data, error } = await send('enablebanking-startauth', {
        country: country.id,
        aspsp,
      });
      if (error) {
        // Handle the error from start auth.
        onErrorRef.current(error);
        return;
      }

      onCompleteRef.current(data);
    } catch (err) {
      onErrorRef.current({
        error_code: 'INTERNAL_ERROR',
        error_type: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setStartingAuth(false);
    }
  };

  if (availableCountries === null) {
    return (
      <WaitingIndicator
        message={t('Getting the available countries from Enable Banking.')}
      />
    );
  }

  return (
    <View>
      <FormField>
        <FormLabel
          title={t('Choose the country of your bank:')}
          htmlFor="country-field"
        />
        <Autocomplete
          focused
          strict
          highlightFirst
          suggestions={[...availableCountries].sort((a, b) =>
            a.name.localeCompare(b.name),
          )}
          onSelect={onSelectCountry}
          value={country ? country.id : null}
          inputProps={{
            id: 'country-field',
            placeholder: t('(please select)'),
          }}
        />
      </FormField>
      {country && !availableAspsps && (
        <WaitingIndicator
          message={t('Getting banks for {{countryName}}.', {
            countryName: country.name,
          })}
        />
      )}

      {country && availableAspsps && (
        <FormField>
          <FormLabel title={t('Choose your bank:')} htmlFor="bank-field" />
          <Autocomplete
            focused
            strict
            highlightFirst
            key={country.id}
            suggestions={availableAspsps
              .map(bank => {
                return { id: bank.name, ...bank };
              })
              .sort((a, b) => a.name.localeCompare(b.name))}
            onSelect={setAspsp}
            value={aspsp}
            inputProps={{
              id: 'bank-field',
              placeholder: t('(please select)'),
            }}
          />
        </FormField>
      )}
      {country && aspsp && (
        <View>
          <Warning>
            <Trans>
              By enabling bank sync, you will be granting Enable Banking (a
              third party service) read-only access to your entire account's
              transaction history. This service is not affiliated with Actual in
              any way. Make sure you've read and understand Enable Banking's{' '}
              <Link
                variant="external"
                to="https://enablebanking.com/privacy/"
                linkColor="purple"
              >
                Privacy Policy
              </Link>{' '}
              before proceeding.
            </Trans>
          </Warning>
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
            <ButtonWithLoading
              variant="primary"
              autoFocus
              style={{
                padding: '10px 0',
                fontSize: 15,
                fontWeight: 600,
                flexGrow: 1,
              }}
              onPress={onLink}
              isLoading={startingAuth}
            >
              <Trans>Link bank in browser</Trans> &rarr;
            </ButtonWithLoading>
          </View>
        </View>
      )}
    </View>
  );
};

const PollingComponent = ({
  authenticationStartResponse,
  onComplete,
  onError,
}: {
  authenticationStartResponse: EnableBankingAuthenticationStartResponse;
  onComplete: (token: EnableBankingToken) => void;
  onError: (error: EnableBankingErrorInterface) => void;
}) => {
  const { t } = useTranslation();

  // Use refs to avoid infinite loops and to safely call callbacks after unmount check
  const onCompleteRef = useRef(onComplete);
  const onErrorRef = useRef(onError);
  useEffect(() => {
    onCompleteRef.current = onComplete;
    onErrorRef.current = onError;
  }, [onComplete, onError]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { redirect_url, state } = authenticationStartResponse;
      // Open redirect_url in browser
      window.Actual.openURLInBrowser(redirect_url);
      // Polling starts here
      const { data, error } = await send('enablebanking-pollauth', { state });

      if (cancelled) return;

      if (error) {
        onErrorRef.current(error);
        return;
      }
      onCompleteRef.current(data);
    })();

    return () => {
      cancelled = true;
    };
  }, [authenticationStartResponse]);

  return (
    <WaitingIndicator
      message={t('Please complete the authentication in the opened window.')}
    />
  );
};

const CompletedAuthorizationIndicator = ({
  onContinue,
}: {
  onContinue: () => Promise<void>;
}) => {
  return (
    <Button
      variant="primary"
      autoFocus
      style={{
        padding: '10px 0',
        fontSize: 15,
        fontWeight: 600,
        marginTop: 10,
      }}
      onPress={async () => {
        await onContinue();
      }}
    >
      <Trans>Success! Click to continue</Trans> &rarr;
    </Button>
  );
};

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

  // Stop polling when modal is unmounted
  useEffect(() => {
    return () => {
      void send('enablebanking-stoppolling');
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
          init_country={initialCountry}
          init_aspsp={initialAspsp}
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
                          // Then open account selection modal
                          const timeoutId = setTimeout(() => {
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

                          // Store timeout ID for potential cleanup
                          return () => clearTimeout(timeoutId);
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
      {({ state: { close } }) => {
        // Reconstruct component with access to close function
        let componentWithClose: ReactElement | null = component;

        if (phase === 'done' && token !== null) {
          componentWithClose = (
            <CompletedAuthorizationIndicator
              onContinue={async () => {
                try {
                  await onSuccess(token);
                  // CodeRabbit suggested calling close() here, but we intentionally don't
                  // Don't call close() - onSuccess handles closing this modal
                  // and opening the account selection modal
                } catch (error) {
                  // Error is handled by setting error state for user feedback
                  setError({
                    error_code: 'INTERNAL_ERROR',
                    error_type:
                      error instanceof Error ? error.message : String(error),
                  });
                  // Don't reset state on error - let user manually retry
                }
              }}
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
              rightContent={<ModalCloseButton onPress={close} />}
            />
            <View>
              {error && renderError(error, t)}
              <Paragraph style={{ fontSize: 15 }}>
                <Trans>
                  To link your bank account, you will be redirected to a new
                  page where EnableBanking will ask to connect to your bank.
                  Enable Banking will not be able to withdraw funds from your
                  accounts.
                </Trans>
              </Paragraph>
              {componentWithClose!}
            </View>
          </>
        );
      }}
    </Modal>
  );
}
