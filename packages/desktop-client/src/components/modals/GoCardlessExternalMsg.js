import React, { useEffect, useState, useRef } from 'react';
import { useDispatch } from 'react-redux';

import { pushModal } from 'loot-core/src/client/actions/modals';
import { sendCatch } from 'loot-core/src/platform/client/fetch';

import useGoCardlessStatus from '../../hooks/useGoCardlessStatus';
import AnimatedLoading from '../../icons/AnimatedLoading';
import DotsHorizontalTriple from '../../icons/v1/DotsHorizontalTriple';
import { theme } from '../../style';
import { Error, Warning } from '../alerts';
import Autocomplete from '../autocomplete/Autocomplete';
import {
  View,
  Modal,
  Button,
  P,
  LinkButton,
  Menu,
  Tooltip,
  ExternalLink,
} from '../common';
import { FormField, FormLabel } from '../forms';

import { COUNTRY_OPTIONS } from './countries';

function useAvailableBanks(country) {
  const [banks, setBanks] = useState([]);
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

function renderError(error) {
  return (
    <Error style={{ alignSelf: 'center' }}>
      {error === 'timeout'
        ? 'Timed out. Please try again.'
        : 'An error occurred while linking your account, sorry!'}
    </Error>
  );
}

export default function GoCardlessExternalMsg({
  modalProps,
  onMoveExternal,
  onSuccess,
  onClose: originalOnClose,
}) {
  const dispatch = useDispatch();

  let [waiting, setWaiting] = useState(null);
  let [success, setSuccess] = useState(false);
  let [institutionId, setInstitutionId] = useState();
  let [country, setCountry] = useState();
  let [error, setError] = useState(null);
  let [isGoCardlessSetupComplete, setIsGoCardlessSetupComplete] =
    useState(null);
  let [menuOpen, setMenuOpen] = useState(false);
  let data = useRef(null);

  const {
    data: bankOptions,
    isLoading: isBankOptionsLoading,
    isError: isBankOptionError,
  } = useAvailableBanks(country);
  const { configured: isConfigured, isLoading: isConfigurationLoading } =
    useGoCardlessStatus();

  async function onJump() {
    setError(null);
    setWaiting('browser');

    let res = await onMoveExternal({ institutionId });
    if (res.error) {
      setError(res.error);
      setWaiting(null);
      return;
    }

    data.current = res.data;
    setWaiting(null);
    setSuccess(true);
  }

  function onClose() {
    originalOnClose?.();
    modalProps.onClose();
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
            disabled={isConfigurationLoading}
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
            <LinkButton
              onClick={onGoCardlessInit}
              style={{ display: 'inline' }}
            >
              set them up
            </LinkButton>{' '}
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
          <ExternalLink to="https://gocardless.com/privacy/">
            Privacy Policy
          </ExternalLink>{' '}
          before proceeding.
        </Warning>

        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
          <Button
            primary
            style={{
              padding: '10px 0',
              fontSize: 15,
              fontWeight: 600,
              flexGrow: 1,
            }}
            onClick={onJump}
            disabled={!institutionId || !country}
          >
            Link bank in browser &rarr;
          </Button>
          <Button bare onClick={() => setMenuOpen(true)} aria-label="Menu">
            <DotsHorizontalTriple
              width={15}
              height={15}
              style={{ transform: 'rotateZ(90deg)' }}
            />
            {menuOpen && (
              <Tooltip
                position="bottom-right"
                width={200}
                style={{ padding: 0 }}
                onClose={() => setMenuOpen(false)}
              >
                <Menu
                  onMenuSelect={item => {
                    if (item === 'reconfigure') {
                      onGoCardlessInit();
                    }
                  }}
                  items={[
                    {
                      name: 'reconfigure',
                      text: 'Set new API secrets',
                    },
                  ]}
                />
              </Tooltip>
            )}
          </Button>
        </View>
      </View>
    );
  };

  return (
    <Modal
      title="Link Your Bank"
      {...modalProps}
      onClose={onClose}
      style={{ flex: 0 }}
    >
      {() => (
        <View>
          <P style={{ fontSize: 15 }}>
            To link your bank account, you will be redirected to a new page
            where GoCardless will ask to connect to your bank. GoCardless will
            not be able to withdraw funds from your accounts.
          </P>

          {error && renderError(error)}

          {waiting || isConfigurationLoading ? (
            <View style={{ alignItems: 'center', marginTop: 15 }}>
              <AnimatedLoading
                color={theme.pageTextPositive}
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
                <LinkButton onClick={onJump} style={{ marginTop: 10 }}>
                  (Account linking not opening in a new tab? Click here)
                </LinkButton>
              )}
            </View>
          ) : success ? (
            <Button
              primary
              style={{
                padding: '10px 0',
                fontSize: 15,
                fontWeight: 600,
                marginTop: 10,
                backgroundColor: theme.noticeBackground,
                borderColor: theme.noticeText,
              }}
              onClick={onContinue}
            >
              Success! Click to continue &rarr;
            </Button>
          ) : isConfigured || isGoCardlessSetupComplete ? (
            renderLinkButton()
          ) : (
            <>
              <P style={{ color: theme.errorText }}>
                GoCardless integration has not yet been configured.
              </P>
              <Button primary onClick={onGoCardlessInit}>
                Configure GoCardless integration
              </Button>
            </>
          )}
        </View>
      )}
    </Modal>
  );
}
