import React, { useEffect, useRef, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { AnimatedLoading } from '@actual-app/components/icons/AnimatedLoading';
import { Paragraph } from '@actual-app/components/paragraph';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { sendCatch } from '@actual-app/core/platform/client/connection';
import type {
  EnableBankingAspsp,
  SyncServerEnableBankingAccount,
} from '@actual-app/core/types/models';

import { Error, Warning } from '#components/alerts';
import { Autocomplete } from '#components/autocomplete/Autocomplete';
import { Link } from '#components/common/Link';
import { Modal, ModalCloseButton, ModalHeader } from '#components/common/Modal';
import { FormField, FormLabel } from '#components/forms';
import { COUNTRY_OPTIONS } from '#components/util/countries';
import { getCountryFromBrowser } from '#components/util/localeToCountry';
import { useEnableBankingStatus } from '#hooks/useEnableBankingStatus';
import { useGlobalPref } from '#hooks/useGlobalPref';
import { pushModal } from '#modals/modalsSlice';
import type { Modal as ModalType } from '#modals/modalsSlice';
import { useDispatch } from '#redux';

type BankOption = {
  id: string;
  name: string;
  maxConsentValidity?: number;
};

function useAvailableBanks(
  country: string | undefined,
  refetchKey?: boolean | null,
) {
  const { t } = useTranslation();
  const [banks, setBanks] = useState<BankOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function fetch() {
      setIsError(false);

      if (!country) {
        if (!cancelled) {
          setBanks([]);
          setIsLoading(false);
        }
        return;
      }

      setIsLoading(true);

      const { data, error } = await sendCatch(
        'enablebanking-aspsps',
        country.toUpperCase(),
      );

      if (cancelled) return;

      if (error) {
        setIsError(true);
        setBanks([]);
      } else {
        const aspsps: EnableBankingAspsp[] = data?.aspsps ?? [];
        setBanks(
          aspsps.map(aspsp => ({
            id: `${aspsp.country}:${aspsp.name}`,
            name: aspsp.beta ? `${aspsp.name} ${t('(beta)')}` : aspsp.name,
            maxConsentValidity: aspsp.maximum_consent_validity,
          })),
        );
      }

      setIsLoading(false);
    }

    void fetch();
    return () => {
      cancelled = true;
    };
  }, [country, refetchKey, t]);

  return {
    data: banks,
    isLoading,
    isError,
  };
}

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

type EnableBankingExternalMsgModalProps = Extract<
  ModalType,
  { name: 'enablebanking-external-msg' }
>['options'];

export function EnableBankingExternalMsgModal({
  onMoveExternal,
  onSuccess,
  onClose,
}: EnableBankingExternalMsgModalProps) {
  const { t } = useTranslation();

  const dispatch = useDispatch();
  const [language] = useGlobalPref('language');

  const browserTimezone =
    Intl.DateTimeFormat().resolvedOptions().timeZone || '';
  const browserLocale = language || navigator.language || 'en-US';
  const detectedCountry = getCountryFromBrowser(
    browserTimezone,
    browserLocale,
    COUNTRY_OPTIONS,
  );

  const [waiting, setWaiting] = useState<string | null>(null);
  const [selectedAspsp, setSelectedAspsp] = useState<string>();
  const [country, setCountry] = useState<string | undefined>(detectedCountry);
  const [error, setError] = useState<{
    code: 'unknown' | 'timeout';
    message?: string;
  } | null>(null);
  const [isEnableBankingSetupComplete, setIsEnableBankingSetupComplete] =
    useState<boolean | null>(null);
  const data = useRef<{ accounts: SyncServerEnableBankingAccount[] } | null>(
    null,
  );

  const {
    data: bankOptions,
    isLoading: isBankOptionsLoading,
    isError: isBankOptionError,
  } = useAvailableBanks(country, isEnableBankingSetupComplete);
  const {
    configuredEnableBanking: isConfigured,
    isLoading: isConfigurationLoading,
  } = useEnableBankingStatus();

  const isJumpingRef = useRef(false);
  const stateRef = useRef<string | null>(null);
  // Each onJump call captures a token from this counter. A retry that
  // supersedes an in-flight call increments the counter, so the older call
  // can detect it has been superseded and skip its post-await writes
  // instead of clobbering the newer attempt's UI state and refs.
  const jumpIdRef = useRef(0);

  async function handleClose() {
    if (stateRef.current !== null) {
      await sendCatch('enablebanking-poll-auth-stop', {
        state: stateRef.current,
      });
    }
    onClose?.();
  }

  async function onJump() {
    const myJumpId = ++jumpIdRef.current;

    if (isJumpingRef.current) {
      // Abort the in-flight poll so we can re-open the popup immediately.
      // Only send the stop RPC if we have a state to target; if onMoveExternal
      // hasn't set stateRef yet there is no active poll to abort.
      if (stateRef.current !== null) {
        await sendCatch('enablebanking-poll-auth-stop', {
          state: stateRef.current,
        });
      }
      isJumpingRef.current = false;
    }
    isJumpingRef.current = true;

    try {
      setError(null);
      setWaiting('browser');

      if (!selectedAspsp) return;

      // Parse aspspId (name) and country from the composite id "country:name"
      const colonIndex = selectedAspsp.indexOf(':');
      const aspspCountry = selectedAspsp.slice(0, colonIndex);
      const aspspId = selectedAspsp.slice(colonIndex + 1);

      const selectedBank = bankOptions.find(b => b.id === selectedAspsp);

      const res = await onMoveExternal({
        aspspId,
        country: aspspCountry,
        maxConsentValidity: selectedBank?.maxConsentValidity,
        onStateReady: state => {
          if (myJumpId === jumpIdRef.current) {
            stateRef.current = state;
          }
        },
      });

      // A retry has superseded this call — drop the result so it can't
      // overwrite the newer attempt's error or waiting state.
      if (myJumpId !== jumpIdRef.current) return;

      if ('error' in res) {
        setError({
          code: res.error,
          message: 'message' in res ? res.message : undefined,
        });
        setWaiting(null);
        return;
      }

      data.current = res.data;
      setWaiting('accounts');
      await onSuccess(data.current);
      if (myJumpId !== jumpIdRef.current) return;
      setWaiting(null);
    } finally {
      if (myJumpId === jumpIdRef.current) {
        isJumpingRef.current = false;
        stateRef.current = null;
      }
    }
  }

  const onEnableBankingInit = () => {
    dispatch(
      pushModal({
        modal: {
          name: 'enablebanking-init',
          options: {
            onSuccess: () => setIsEnableBankingSetupComplete(true),
          },
        },
      }),
    );
  };

  const renderLinkButton = () => {
    return (
      <View style={{ gap: 10 }}>
        <FormField>
          <FormLabel
            title={t('Choose your country:')}
            htmlFor="country-field"
          />
          <Autocomplete
            strict
            highlightFirst
            suggestions={COUNTRY_OPTIONS}
            onSelect={value => {
              setCountry(value);
              setSelectedAspsp(undefined);
            }}
            value={country}
            inputProps={{
              id: 'country-field',
              placeholder: t('(please select)'),
            }}
          />
        </FormField>

        {isBankOptionError ? (
          <Error>
            <Trans>
              Failed loading available banks: Enable Banking access credentials
              might be misconfigured. Please{' '}
              <Link
                variant="text"
                onClick={onEnableBankingInit}
                style={{ color: theme.formLabelText, display: 'inline' }}
              >
                set them up
              </Link>{' '}
              again.
            </Trans>
          </Error>
        ) : (
          country &&
          (isBankOptionsLoading ? (
            t('Loading banks...')
          ) : (
            <FormField>
              <FormLabel title={t('Choose your bank:')} htmlFor="bank-field" />
              <Autocomplete
                focused
                strict
                highlightFirst
                suggestions={bankOptions}
                onSelect={setSelectedAspsp}
                value={selectedAspsp}
                inputProps={{
                  id: 'bank-field',
                  placeholder: t('(please select)'),
                }}
              />
            </FormField>
          ))
        )}

        <Warning>
          <Trans>
            By enabling bank sync, you will be granting Enable Banking (a third
            party service) read-only access to your entire account's transaction
            history. This service is not affiliated with Actual in any way. Make
            sure you've read and understand Enable Banking's{' '}
            <Link
              variant="external"
              to="https://enablebanking.com/privacy-policy/"
              linkColor="purple"
            >
              Privacy Policy
            </Link>{' '}
            before proceeding.
          </Trans>
        </Warning>

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
            isDisabled={!selectedAspsp || !country}
          >
            <Trans>Link bank in browser</Trans> &rarr;
          </Button>
        </View>
      </View>
    );
  };

  return (
    <Modal
      name="enablebanking-external-msg"
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
                where Enable Banking will ask to connect to your bank. Enable
                Banking will not be able to withdraw funds from your accounts.
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
                    ? t('Checking Enable Banking configuration...')
                    : waiting === 'browser'
                      ? t('Waiting on Enable Banking...')
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
            ) : isConfigured || isEnableBankingSetupComplete ? (
              renderLinkButton()
            ) : (
              <>
                <Paragraph style={{ color: theme.errorText }}>
                  <Trans>
                    Enable Banking integration has not yet been configured.
                  </Trans>
                </Paragraph>
                <Button variant="primary" onPress={onEnableBankingInit}>
                  <Trans>Configure Enable Banking integration</Trans>
                </Button>
              </>
            )}
          </View>
        </>
      )}
    </Modal>
  );
}
