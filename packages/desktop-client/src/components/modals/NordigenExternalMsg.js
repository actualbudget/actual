import React, { useEffect, useState, useRef } from 'react';

import { send } from 'loot-core/src/platform/client/fetch';

import AnimatedLoading from '../../icons/AnimatedLoading';
import { colors } from '../../style';
import { Error, Warning } from '../alerts';
import Autocomplete from '../autocomplete/NewAutocomplete';
import { View, Modal, Button, P } from '../common';
import { FormField, FormLabel } from '../forms';

import { COUNTRY_OPTIONS } from './countries';

function useAvailableBanks(country) {
  const [banks, setBanks] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function fetch() {
      if (!country) {
        setBanks([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      const results = await send('nordigen-get-banks', country);

      setBanks(results.map(bank => ({ value: bank.id, label: bank.name })));
      setIsLoading(false);
    }

    fetch();
  }, [setBanks, setIsLoading, country]);

  return {
    data: banks,
    isLoading,
  };
}

function useNordigenStatus() {
  const [configured, setConfigured] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function fetch() {
      setIsLoading(true);

      const results = await send('nordigen-status');

      setConfigured(results.configured || false);
      setIsLoading(false);
    }

    fetch();
  }, [setConfigured, setIsLoading]);

  return {
    configured,
    isLoading,
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

export default function NordigenExternalMsg({
  modalProps,
  onMoveExternal,
  onSuccess,
  onClose: originalOnClose,
}) {
  let [waiting, setWaiting] = useState(null);
  let [success, setSuccess] = useState(false);
  let [institutionId, setInstitutionId] = useState();
  let [country, setCountry] = useState();
  let [error, setError] = useState(null);
  let data = useRef(null);

  const { data: bankOptions, isLoading: isBankOptionsLoading } =
    useAvailableBanks(country);
  const { configured: isConfigured, isLoading: isConfigurationLoading } =
    useNordigenStatus();

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
    originalOnClose && originalOnClose();
    modalProps.onClose();
  }

  async function onContinue() {
    setWaiting('accounts');
    await onSuccess(data.current);
    setWaiting(null);
  }

  const renderLinkButton = () => {
    return (
      <View style={{ gap: 10 }}>
        <FormField>
          <FormLabel title="Choose your country:" htmlFor="country-field" />
          <Autocomplete
            disabled={isConfigurationLoading}
            options={COUNTRY_OPTIONS}
            onSelect={setCountry}
            value={COUNTRY_OPTIONS.find(({ value }) => value === country)}
            inputId="country-field"
            placeholder="(please select)"
          />
        </FormField>

        {country &&
          (isBankOptionsLoading ? (
            'Loading banks...'
          ) : (
            <FormField>
              <FormLabel title="Choose your bank:" htmlFor="bank-field" />
              <Autocomplete
                focused
                options={bankOptions}
                onSelect={setInstitutionId}
                value={bankOptions.find(({ value }) => value === institutionId)}
                inputId="bank-field"
                placeholder="(please select)"
              />
            </FormField>
          ))}

        <Warning>
          By enabling bank-sync, you will be granting Nordigen (a third party
          service) read-only access to your entire account’s transaction
          history. This service is not affiliated with Actual in any way. Make
          sure you’ve read and understand Nordigen’s{' '}
          <a
            href="https://nordigen.com/en/company/privacy-policy/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Privacy Policy
          </a>{' '}
          and{' '}
          <a
            href="https://nordigen.com/en/company/privacy-policy-end-user/"
            target="_blank"
            rel="noopener noreferrer"
          >
            End User Privacy Policy
          </a>{' '}
          before proceeding.
        </Warning>

        <Button
          primary
          style={{
            padding: '10px 0',
            fontSize: 15,
            fontWeight: 600,
          }}
          onClick={onJump}
          disabled={!institutionId || !country}
        >
          Link bank in browser &rarr;
        </Button>
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
            where Nordigen will ask to connect to your bank. Nordigen will not
            be able to withdraw funds from your accounts.
          </P>

          {error && renderError(error)}

          {waiting || isConfigurationLoading ? (
            <View style={{ alignItems: 'center', marginTop: 15 }}>
              <AnimatedLoading
                color={colors.n1}
                style={{ width: 20, height: 20 }}
              />
              <View style={{ marginTop: 10, color: colors.n4 }}>
                {isConfigurationLoading
                  ? 'Checking Nordigen configuration..'
                  : waiting === 'browser'
                  ? 'Waiting on Nordigen...'
                  : waiting === 'accounts'
                  ? 'Loading accounts...'
                  : null}
              </View>
            </View>
          ) : success ? (
            <Button
              primary
              style={{
                padding: '10px 0',
                fontSize: 15,
                fontWeight: 600,
                marginTop: 10,
                backgroundColor: colors.g4,
                borderColor: colors.g4,
              }}
              onClick={onContinue}
            >
              Success! Click to continue &rarr;
            </Button>
          ) : isConfigured ? (
            renderLinkButton()
          ) : (
            <P style={{ color: colors.r5 }}>
              Nordigen integration has not been configured so linking accounts
              is not available.{' '}
              <a
                href="https://actualbudget.github.io/docs/Accounts/connecting-your-bank/"
                target="_blank"
                rel="noopener noreferrer"
              >
                Learn more.
              </a>
            </P>
          )}
        </View>
      )}
    </Modal>
  );
}
