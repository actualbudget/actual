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

          {waiting ? (
            <View style={{ alignItems: 'center', marginTop: 15 }}>
              <AnimatedLoading
                color={colors.n1}
                style={{ width: 20, height: 20 }}
              />
              <View style={{ marginTop: 10, color: colors.n4 }}>
                {waiting === 'browser'
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
          ) : (
            renderLinkButton()
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
