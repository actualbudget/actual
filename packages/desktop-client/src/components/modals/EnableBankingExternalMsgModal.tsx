import React, { useEffect, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { AnimatedLoading } from '@actual-app/components/icons/AnimatedLoading';
import { Input } from '@actual-app/components/input';
import { Paragraph } from '@actual-app/components/paragraph';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { sendCatch } from 'loot-core/platform/client/connection';

import { Error } from '@desktop-client/components/alerts';
import { Autocomplete } from '@desktop-client/components/autocomplete/Autocomplete';
import {
  Modal,
  ModalCloseButton,
  ModalHeader,
} from '@desktop-client/components/common/Modal';
import { ENABLEBANKING_CALLBACK_MESSAGE_TYPE } from '@desktop-client/components/EnableBankingCallbackPage';
import { FormField, FormLabel } from '@desktop-client/components/forms';
import { COUNTRY_OPTIONS } from '@desktop-client/components/util/countries';
import { getCountryFromBrowser } from '@desktop-client/components/util/localeToCountry';
import { useGlobalPref } from '@desktop-client/hooks/useGlobalPref';
import type { Modal as ModalType } from '@desktop-client/modals/modalsSlice';

type EnableBankingInstitution = {
  id: string;
  name: string;
  logo: string;
  countries: string[];
};

function useAvailableBanks(country: string | undefined) {
  const [banks, setBanks] = useState<EnableBankingInstitution[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    async function fetch() {
      setIsError(false);

      if (!country) {
        setBanks([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      const { data, error } = await sendCatch(
        'enablebanking-get-banks',
        country,
      );

      if (error || !Array.isArray(data)) {
        setIsError(true);
        setBanks([]);
      } else {
        setBanks(data);
      }

      setIsLoading(false);
    }

    void fetch();
  }, [country]);

  return {
    data: banks,
    isLoading,
    isError,
  };
}

type EnableBankingExternalMsgModalProps = Extract<
  ModalType,
  { name: 'enablebanking-external-msg' }
>['options'];

export function EnableBankingExternalMsgModal({
  onSuccess,
  onClose,
}: EnableBankingExternalMsgModalProps) {
  const { t } = useTranslation();
  const [language] = useGlobalPref('language');

  const browserTimezone =
    Intl.DateTimeFormat().resolvedOptions().timeZone || '';
  const browserLocale = language || navigator.language || 'en-US';
  const detectedCountry = getCountryFromBrowser(
    browserTimezone,
    browserLocale,
    COUNTRY_OPTIONS,
  );

  const [step, setStep] = useState<
    'select-bank' | 'waiting-auth' | 'enter-code' | 'completing' | 'success'
  >('select-bank');
  const [country, setCountry] = useState<string | undefined>(detectedCountry);
  const [institutionId, setInstitutionId] = useState<string | undefined>();
  const [authUrl, setAuthUrl] = useState<string | null>(null);
  const [authCode, setAuthCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [completedData, setCompletedData] = useState<{
    accounts: Array<{
      account_id: string;
      name: string;
      mask: string;
      institution?: string;
      iban?: string;
      orgId?: string;
      orgDomain?: string;
    }>;
  } | null>(null);

  const {
    data: bankOptions,
    isLoading: isBankOptionsLoading,
    isError: isBankOptionError,
  } = useAvailableBanks(country);

  useEffect(() => {
    if (step !== 'enter-code' && step !== 'waiting-auth') return;

    function onMessage(event: MessageEvent) {
      if (
        event.origin !== window.location.origin ||
        !event.data ||
        event.data.type !== ENABLEBANKING_CALLBACK_MESSAGE_TYPE
      ) {
        return;
      }
      const code = event.data.code as string | undefined;
      if (code) {
        setAuthCode(code);
        void completeAuth(code);
      }
    }

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  async function completeAuth(code: string) {
    setError(null);
    setStep('completing');

    const { data, error: err } = await sendCatch(
      'enablebanking-complete-session',
      { code: code.trim() },
    );

    if (err || !data || data.error_code) {
      setError(
        err?.message ??
          data?.error_type ??
          t('Failed to complete Enable Banking authentication.'),
      );
      setStep('enter-code');
      return;
    }

    setCompletedData({ accounts: data.accounts ?? [] });
    setStep('success');
  }

  async function onLinkBank() {
    if (!institutionId || !country) return;

    setError(null);
    setStep('waiting-auth');

    const redirectUrl = window.location.origin + '/enablebanking-callback';

    const { data, error: err } = await sendCatch(
      'enablebanking-create-session',
      {
        aspsp: institutionId,
        redirectUrl,
        country,
      },
    );

    if (err || !data?.url) {
      setError(err?.message ?? t('Failed to create Enable Banking session.'));
      setStep('select-bank');
      return;
    }

    setAuthUrl(data.url);
    window.open(
      data.url,
      'enablebanking-auth',
      'width=600,height=700,noopener=no',
    );
    setStep('enter-code');
  }

  async function onCompleteAuth() {
    if (!authCode.trim()) return;
    await completeAuth(authCode.trim());
  }

  async function onContinue() {
    if (completedData) {
      await onSuccess(completedData);
    }
  }

  return (
    <Modal
      name="enablebanking-external-msg"
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
                To link your bank account, select your bank and click the
                button. A popup window will open for you to authenticate. Once
                complete, this dialog will advance automatically.
              </Trans>
            </Paragraph>

            {error && (
              <Error
                style={{
                  alignSelf: 'stretch',
                  marginBottom: 10,
                  userSelect: 'text',
                  wordBreak: 'break-word',
                  maxHeight: 120,
                  overflowY: 'auto',
                  fontSize: 12,
                }}
              >
                {error}
              </Error>
            )}

            {step === 'select-bank' && (
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
                    onSelect={setCountry}
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
                      Failed loading available banks. Please check your Enable
                      Banking credentials.
                    </Trans>
                  </Error>
                ) : (
                  country &&
                  (isBankOptionsLoading ? (
                    t('Loading banks...')
                  ) : (
                    <FormField>
                      <FormLabel
                        title={t('Choose your bank:')}
                        htmlFor="bank-field"
                      />
                      <Autocomplete
                        focused
                        strict
                        highlightFirst
                        suggestions={bankOptions}
                        onSelect={setInstitutionId}
                        value={institutionId}
                        inputProps={{
                          id: 'bank-field',
                          placeholder: t('(please select)'),
                        }}
                      />
                    </FormField>
                  ))
                )}

                <Button
                  variant="primary"
                  autoFocus
                  style={{
                    padding: '10px 0',
                    fontSize: 15,
                    fontWeight: 600,
                    marginTop: 10,
                  }}
                  onPress={onLinkBank}
                  isDisabled={!institutionId || !country}
                >
                  <Trans>Link bank in browser</Trans> &rarr;
                </Button>
              </View>
            )}

            {step === 'waiting-auth' && (
              <View style={{ alignItems: 'center', marginTop: 15 }}>
                <AnimatedLoading
                  color={theme.pageTextDark}
                  style={{ width: 20, height: 20 }}
                />
                <View style={{ marginTop: 10, color: theme.pageText }}>
                  {t('Creating authentication session...')}
                </View>
              </View>
            )}

            {step === 'enter-code' && (
              <View style={{ gap: 10 }}>
                <Paragraph style={{ fontSize: 13 }}>
                  <Trans>
                    A popup window has been opened for you to authenticate with
                    your bank. After completing authentication, this dialog will
                    advance automatically. If the popup was blocked, use the
                    link below to open it manually and paste the code.
                  </Trans>
                </Paragraph>

                {authUrl && (
                  <Button
                    variant="bare"
                    onPress={() =>
                      window.open(
                        authUrl,
                        'enablebanking-auth',
                        'width=600,height=700,noopener=no',
                      )
                    }
                    style={{ fontSize: 13 }}
                  >
                    <Trans>Popup blocked? Click here to open again</Trans>
                  </Button>
                )}

                <FormField>
                  <FormLabel
                    title={t('Authorization code:')}
                    htmlFor="auth-code"
                  />
                  <Input
                    id="auth-code"
                    value={authCode}
                    onChangeValue={setAuthCode}
                    placeholder={t('Paste the code here')}
                  />
                </FormField>

                <Button
                  variant="primary"
                  style={{
                    padding: '10px 0',
                    fontSize: 15,
                    fontWeight: 600,
                  }}
                  onPress={onCompleteAuth}
                  isDisabled={!authCode.trim()}
                >
                  <Trans>Complete authentication</Trans>
                </Button>
              </View>
            )}

            {step === 'completing' && (
              <View style={{ alignItems: 'center', marginTop: 15 }}>
                <AnimatedLoading
                  color={theme.pageTextDark}
                  style={{ width: 20, height: 20 }}
                />
                <View style={{ marginTop: 10, color: theme.pageText }}>
                  {t('Completing authentication and loading accounts...')}
                </View>
              </View>
            )}

            {step === 'success' && (
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
            )}
          </View>
        </>
      )}
    </Modal>
  );
}
