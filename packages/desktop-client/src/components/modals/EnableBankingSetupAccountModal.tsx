// @ts-strict-ignore
import React, { useEffect, useState, useRef } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { AnimatedLoading } from '@actual-app/components/icons/AnimatedLoading';
import { Paragraph } from '@actual-app/components/paragraph';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { sendCatch } from 'loot-core/platform/client/fetch';

import { Error, Warning } from '@desktop-client/components/alerts';
import { Autocomplete } from '@desktop-client/components/autocomplete/Autocomplete';
import { Link } from '@desktop-client/components/common/Link';
import {
  Modal,
  ModalCloseButton,
  ModalHeader,
} from '@desktop-client/components/common/Modal';
import { FormField, FormLabel } from '@desktop-client/components/forms';
import { COUNTRY_OPTIONS } from '@desktop-client/components/util/countries';
import {
  type Modal as ModalType,
  pushModal,
} from '@desktop-client/modals/modalsSlice';
import { useDispatch } from '@desktop-client/redux';
import { useEnableBankingStatus } from '@desktop-client/hooks/useEnableBankingStatus';
import { EnableBankingBank, EnableBankingToken, ErrorResponse, isErrorResponse } from 'loot-core/types/models/enablebanking';
import { count } from 'console';

import { send } from 'loot-core/platform/client/fetch';


function useAvailableBanks(isConfigured) {
  const [banks, setBanks] = useState<EnableBankingBank[]>([]);
  const [countries, setCountries] = useState<typeof COUNTRY_OPTIONS>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    async function fetch() {
      if(!isConfigured){
        return;
      }
      setIsError(false);
      setIsLoading(true);

      const { data, error } = await sendCatch('enablebanking-banks');

      if (error || !Array.isArray(data)) {
        setIsError(true);
        setBanks([]);
      } else {
        setBanks(data);
        let cids = new Set(data.map(bank => bank.country))
        setCountries(COUNTRY_OPTIONS.filter((val) => cids.has(val.id)))
      }

      setIsLoading(false);
    }

    fetch();
  }, [isConfigured,setBanks, setIsLoading]);

  return {
    banks,
    countries,
    isLoading,
    isError,
  };
}

function renderError(
  error: { code: string; message?: string },
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

type EnableBankingSetupAccountModalProps = Extract<
  ModalType,
  { name: 'enablebanking-setup-account' }
>['options'];

export function EnableBankingSetupAccountModal({
  onSuccess,
}: EnableBankingSetupAccountModalProps) {
  const { t } = useTranslation();

  const dispatch = useDispatch();

  const [waiting, setWaiting] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [country, setCountry] = useState<string | null>(null);
  const [institutionId, setInstitutionId] = useState<string>();
  const [error, setError] = useState<{
    code: string;
    message?: string;
  } | null>(null);
  const [isEnableBankingSetupComplete, setIsEnableBankingSetupComplete] = useState<
    boolean | null
  >(null);
  const data = useRef<EnableBankingToken | null>(null);

  const {
    configuredEnableBanking: isConfigured,
    isLoading: isConfigurationLoading,
  } = useEnableBankingStatus();

  const {
    banks: bankOptions,
    countries: countryOptions,
    isLoading: isBankOptionsLoading,
    isError: isBankOptionError,
  } = useAvailableBanks(isConfigured);

  async function onClose(){
    const resp = await send("enablebanking-stoppolling",);
  }

  async function onJump() {
    setError(null);
    setWaiting('browser');

    const resp = await send("enablebanking-startauth",{country, aspsp:institutionId});

    if ('error' in resp){
      setError({
        code: resp.error,
        message: 'message' in resp ? resp.message : undefined,
      });
      setWaiting(null);
      return;
    }
    const { redirect_url, state } = resp;
    window.Actual.openURLInBrowser(redirect_url);
    //polling starts here.
    const polling_response = await send("enablebanking-pollauth", {state});

    if (isErrorResponse(polling_response)) {
      setError({
        code: polling_response.error_code,
        message: 'message' in polling_response ? polling_response.error_type : undefined,
      });
      setWaiting(null);
      return;
    }
    data.current = polling_response;
    setWaiting(null);
    setSuccess(true);
  }

  async function onContinue() {
    setWaiting('accounts');
    await onSuccess(data.current);
    setWaiting(null);
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
          (isBankOptionsLoading ? (
            t('Loading banks...')
          ) : (
            <View>
              <FormField>
                <FormLabel title={t("Choose the country of your bank:")} htmlFor='country-field' />
                <Autocomplete
                  focused
                  strict
                  highlightFirst
                  suggestions={countryOptions.sort((a,b)=>a.name.localeCompare(b.name))}
                  onSelect={(val)=>{
                    setCountry(val)
                    setInstitutionId("")
                  }}
                  value={country}
                  inputProps={{
                    id: 'country-field',
                    placeholder: t('(please select)'),
                  }}
                  />
              </FormField>
              {(country &&
                <FormField>
                  <FormLabel title={t('Choose your bank:')} htmlFor="bank-field" />
                  <Autocomplete
                    focused
                    strict
                    highlightFirst
                    key={country}
                    suggestions={bankOptions.map((bank)=>{return{id:bank.name,...bank}}).filter(bank => bank.country==country).sort((a,b)=>a.name.localeCompare(b.name))}
                    onSelect={setInstitutionId}
                    value={institutionId}
                    inputProps={{
                      id: 'bank-field',
                      placeholder: t('(please select)'),
                    }}
                  />
                </FormField>
              )}
            </View>
          ))
        )}
        {(country && institutionId &&
        <Warning>
          <Trans>
            By enabling bank sync, you will be granting Enable Banking (a third
            party service) read-only access to your entire account’s transaction
            history. This service is not affiliated with Actual in any way. Make
            sure you’ve read and understand Enable Banking’s{' '}
            <Link
              variant="external"
              to="https://gocardless.com/privacy/"
              linkColor="purple"
            >
              Privacy Policy
            </Link>{' '}
            before proceeding.
          </Trans>
        </Warning>)}

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
            isDisabled={!institutionId || !country}
          >
            <Trans>Link bank in browser</Trans> &rarr;
          </Button>
        </View>
      </View>
    );
  };

  return (
    <Modal
      name="enablebanking-setup-account"
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
                where EnableBanking will ask to connect to your bank. Enable Banking
                will not be able to withdraw funds from your accounts.
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
            ) : isConfigured || isEnableBankingSetupComplete ? (
              renderLinkButton()
            ) : (
              <>
              <div dangerouslySetInnerHTML={{__html: `
        <enablebanking-consent
          id="enablebanking-consent"
          authorization="a8bfe9f4-dfdf-4c86-9a94-9db7660bd4bd"
          locale="SV"
          can-cancel
          sandbox></enablebanking-consent>
          `}} />
                <Paragraph style={{ color: theme.errorText }}>
                  <Trans>
                    GoCardless integration has not yet been configured.
                  </Trans>
                </Paragraph>
                <Button variant="primary" onPress={onEnableBankingInit}>
                  <Trans>Configure GoCardless integration</Trans>
                </Button>
              </>
            )}
          </View>
        </>
      )}
    </Modal>
  );
}

