// @ts-strict-ignore
import React, { useEffect, useState, useRef } from 'react';
import { useDispatch } from 'react-redux';

import { pushModal } from 'loot-core/src/client/actions/modals';
import { sendCatch } from 'loot-core/src/platform/client/fetch';
import {
  type GoCardlessInstitution,
  type GoCardlessToken,
} from 'loot-core/src/types/models';

import { useGoCardlessStatus } from '../../hooks/useGoCardlessStatus';
import { AnimatedLoading } from '../../icons/AnimatedLoading';
import { theme } from '../../style';
import { Error, Warning } from '../alerts';
import { Autocomplete } from '../autocomplete/Autocomplete';
import { Button } from '../common/Button2';
import { Link } from '../common/Link';
import { Modal, ModalCloseButton, ModalHeader } from '../common/Modal2';
import { Paragraph } from '../common/Paragraph';
import { View } from '../common/View';
import { FormField, FormLabel } from '../forms';

import { COUNTRY_OPTIONS } from './countries';

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

      if (error) {
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

function renderError(error: 'unknown' | 'timeout') {
  return (
    <Error style={{ alignSelf: 'center' }}>
      {error === 'timeout'
        ? 'Timed out. Please try again.'
        : 'An error occurred while linking your account, sorry!'}
    </Error>
  );
}

type GoCardlessExternalMsgProps = {
  onMoveExternal: (arg: {
    institutionId: string;
  }) => Promise<{ error?: 'unknown' | 'timeout'; data?: GoCardlessToken }>;
  onSuccess: (data: GoCardlessToken) => Promise<void>;
  onClose: () => void;
};

export function GoCardlessExternalMsg({
  onMoveExternal,
  onSuccess,
  onClose,
}: GoCardlessExternalMsgProps) {
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
      pushModal('gocardless-init', {
        onSuccess: () => setIsGoCardlessSetupComplete(true),
      }),
    );
  };

  const renderLinkButton = () => {
    return (
      <View style={{ gap: 10 }}>
        <FormField>
          <FormLabel title="Choose your country:" htmlFor="country-field" />
          <Autocomplete
            strict
            highlightFirst
            suggestions={COUNTRY_OPTIONS}
            onSelect={setCountry}
            value={country}
            inputProps={{ id: 'country-field', placeholder: '(please select)' }}
          />
        </FormField>

        {isBankOptionError ? (
          <Error>
            Failed loading available banks: GoCardless access credentials might
            be misconfigured. Please{' '}
            <Link
              variant="text"
              onClick={onGoCardlessInit}
              style={{ color: theme.formLabelText, display: 'inline' }}
            >
              set them up
            </Link>{' '}
            again.
          </Error>
        ) : (
          country &&
          (isBankOptionsLoading ? (
            'Loading banks...'
          ) : (
            <FormField>
              <FormLabel title="Choose your bank:" htmlFor="bank-field" />
              <Autocomplete
                focused
                strict
                highlightFirst
                suggestions={bankOptions}
                onSelect={setInstitutionId}
                value={institutionId}
                inputProps={{
                  id: 'bank-field',
                  placeholder: '(please select)',
                }}
              />
            </FormField>
          ))
        )}

        <Warning>
          By enabling bank-sync, you will be granting GoCardless (a third party
          service) read-only access to your entire account’s transaction
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
        </Warning>

        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
          <Button
            variant="primary"
            style={{
              padding: '10px 0',
              fontSize: 15,
              fontWeight: 600,
              flexGrow: 1,
            }}
            onPress={onJump}
            isDisabled={!institutionId || !country}
          >
            Link bank in browser &rarr;
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
            title="Link Your Bank"
            rightContent={<ModalCloseButton onClick={close} />}
          />
          <View>
            <Paragraph style={{ fontSize: 15 }}>
              To link your bank account, you will be redirected to a new page
              where GoCardless will ask to connect to your bank. GoCardless will
              not be able to withdraw funds from your accounts.
            </Paragraph>

            {error && renderError(error)}

            {waiting || isConfigurationLoading ? (
              <View style={{ alignItems: 'center', marginTop: 15 }}>
                <AnimatedLoading
                  color={theme.pageTextDark}
                  style={{ width: 20, height: 20 }}
                />
                <View style={{ marginTop: 10, color: theme.pageText }}>
                  {isConfigurationLoading
                    ? 'Checking GoCardless configuration..'
                    : waiting === 'browser'
                      ? 'Waiting on GoCardless...'
                      : waiting === 'accounts'
                        ? 'Loading accounts...'
                        : null}
                </View>

                {waiting === 'browser' && (
                  <Link
                    variant="text"
                    onClick={onJump}
                    style={{ marginTop: 10 }}
                  >
                    (Account linking not opening in a new tab? Click here)
                  </Link>
                )}
              </View>
            ) : success ? (
              <Button
                variant="primary"
                style={{
                  padding: '10px 0',
                  fontSize: 15,
                  fontWeight: 600,
                  marginTop: 10,
                }}
                onPress={onContinue}
              >
                Success! Click to continue &rarr;
              </Button>
            ) : isConfigured || isGoCardlessSetupComplete ? (
              renderLinkButton()
            ) : (
              <>
                <Paragraph style={{ color: theme.errorText }}>
                  GoCardless integration has not yet been configured.
                </Paragraph>
                <Button variant="primary" onPress={onGoCardlessInit}>
                  Configure GoCardless integration
                </Button>
              </>
            )}
          </View>
        </>
      )}
    </Modal>
  );
}
