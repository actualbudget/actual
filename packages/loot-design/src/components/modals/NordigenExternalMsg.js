import React, { useEffect, useState, useRef } from 'react';

import { send } from 'loot-core/src/platform/client/fetch';

import { colors } from '../../style';
import AnimatedLoading from '../../svg/AnimatedLoading';
import { Error } from '../alerts';
import Autocomplete from '../Autocomplete';
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

      setBanks(results);
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
      <View>
        <FormField style={{ marginBottom: 10 }}>
          <FormLabel title="Choose your country:" htmlFor="country-field" />
          <Autocomplete
            strict
            disabled={isConfigurationLoading}
            suggestions={COUNTRY_OPTIONS}
            onSelect={setCountry}
            value={country}
            inputProps={{
              id: 'country-field',
              placeholder: '(please select)',
            }}
            renderItems={(items, getItemProps, highlightedIndex) => (
              <ItemList
                items={items}
                getItemProps={getItemProps}
                highlightedIndex={highlightedIndex}
              />
            )}
          />
        </FormField>

        {country &&
          (isBankOptionsLoading ? (
            'Loading banks...'
          ) : (
            <FormField>
              <FormLabel title="Choose your bank:" htmlFor="bank-field" />
              <Autocomplete
                strict
                focused
                suggestions={bankOptions}
                onSelect={setInstitutionId}
                value={institutionId}
                inputProps={{
                  id: 'bank-field',
                  placeholder: '(please select)',
                }}
                renderItems={(items, getItemProps, highlightedIndex) => (
                  <ItemList
                    items={items}
                    getItemProps={getItemProps}
                    highlightedIndex={highlightedIndex}
                  />
                )}
              />
            </FormField>
          ))}

        <Button
          primary
          style={{
            padding: '10px 0',
            fontSize: 15,
            fontWeight: 600,
            marginTop: 10,
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
            To link your bank account, you will be redirected to a new tab where
            you will have the possibility to grant access to your bank for
            Nordigen.
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

export function ItemList({ items, getItemProps, highlightedIndex }) {
  return (
    <View
      style={[
        {
          overflow: 'auto',
          padding: '5px 0',
          maxHeight: 175,
        },
      ]}
    >
      {items.map((item, idx) => (
        <div
          key={item.id}
          {...(getItemProps ? getItemProps({ item }) : null)}
          style={{
            backgroundColor:
              highlightedIndex === idx ? colors.n4 : 'transparent',
            padding: 4,
            paddingLeft: 20,
            borderRadius: 0,
          }}
          data-testid={
            'item' + (highlightedIndex === idx ? '-highlighted' : '')
          }
        >
          {item.name}
        </div>
      ))}
    </View>
  );
}
