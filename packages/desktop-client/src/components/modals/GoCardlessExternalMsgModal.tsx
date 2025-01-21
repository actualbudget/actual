// @ts-strict-ignore
import React, { useEffect, useState, useRef } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import {
  type Modal as ModalType,
  pushModal,
} from 'loot-core/client/modals/modalsSlice';
import { sendCatch } from 'loot-core/src/platform/client/fetch';
import {
  type GoCardlessInstitution,
  type GoCardlessToken,
} from 'loot-core/src/types/models';

import { useGoCardlessStatus } from '../../hooks/useGoCardlessStatus';
import { AnimatedLoading } from '../../icons/AnimatedLoading';
import { useDispatch } from '../../redux';
import { theme } from '../../style';
import { Error, Warning } from '../alerts';
import { Autocomplete } from '../autocomplete/Autocomplete';
import { Button } from '../common/Button2';
import { Link } from '../common/Link';
import { Modal, ModalCloseButton, ModalHeader } from '../common/Modal';
import { Paragraph } from '../common/Paragraph';
import { View } from '../common/View';
import { FormField, FormLabel } from '../forms';
import { COUNTRY_OPTIONS } from '../util/countries';

function useAvailableBanks(country: string) {
  const [banks, setBanks] = useState<GoCardlessInstitution[]>([]);
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

      const { data, error } = await sendCatch('gocardless-get-banks', country);

      if (error || !Array.isArray(data)) {
        setIsError(true);
        setBanks([]);
      } else {
        setBanks(data);
      }

      setIsLoading(false);
    }

    fetch();
  }, [setBanks, setIsLoading, country]);

  return {
    data: banks,
    isLoading,
    isError,
  };
}

function renderError(error: 'unknown' | 'timeout', t: (key: string) => string) {
  return (
    <Error style={{ alignSelf: 'center' }}>
      {error === 'timeout'
        ? t('Timed out. Please try again.')
        : t('An error occurred while linking your account, sorry!')}
    </Error>
  );
}

type GoCardlessExternalMsgModalProps = Extract<
  ModalType,
  { name: 'gocardless-external-msg' }
>['options'];

export function GoCardlessExternalMsgModal({
  onMoveExternal,
  onSuccess,
  onClose,
}: GoCardlessExternalMsgModalProps) {
  const { t } = useTranslation();

  const dispatch = useDispatch();

  const [waiting, setWaiting] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [institutionId, setInstitutionId] = useState<string>();
  const [country, setCountry] = useState<string>();
  const [error, setError] = useState<'unknown' | 'timeout' | null>(null);
  const [isGoCardlessSetupComplete, setIsGoCardlessSetupComplete] = useState<
    boolean | null
  >(null);
  const data = useRef<GoCardlessToken | null>(null);

  const {
    data: bankOptions,
    isLoading: isBankOptionsLoading,
    isError: isBankOptionError,
  } = useAvailableBanks(country);
  const {
    configuredGoCardless: isConfigured,
    isLoading: isConfigurationLoading,
  } = useGoCardlessStatus();

  async function onJump() {
    setError(null);
    setWaiting('browser');

    const res = await onMoveExternal({ institutionId });
    if (res.error) {
      setError(res.error);
      setWaiting(null);
      return;
    }

    data.current = res.data;
    setWaiting(null);
    setSuccess(true);
  }

  async function onContinue() {
    setWaiting('accounts');
    await onSuccess(data.current);
    setWaiting(null);
  }

  const onGoCardlessInit = () => {
    dispatch(
      pushModal({
        modal: {
          name: 'gocardless-init',
          options: {
            onSuccess: () => setIsGoCardlessSetupComplete(true),
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
              Failed loading available banks: GoCardless access credentials
              might be misconfigured. Please{' '}
              <Link
                variant="text"
                onClick={onGoCardlessInit}
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

        <Warning>
          <Trans>
            By enabling bank-sync, you will be granting GoCardless (a third
            party service) read-only access to your entire account’s transaction
            history. This service is not affiliated with Actual in any way. Make
            sure you’ve read and understand GoCardless’s{' '}
            <Link
              variant="external"
              to="https://gocardless.com/privacy/"
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
      name="gocardless-external-msg"
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
                where GoCardless will ask to connect to your bank. GoCardless
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
                    ? t('Checking GoCardless configuration..')
                    : waiting === 'browser'
                      ? t('Waiting on GoCardless...')
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
            ) : isConfigured || isGoCardlessSetupComplete ? (
              renderLinkButton()
            ) : (
              <>
                <Paragraph style={{ color: theme.errorText }}>
                  <Trans>
                    GoCardless integration has not yet been configured.
                  </Trans>
                </Paragraph>
                <Button variant="primary" onPress={onGoCardlessInit}>
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
