import React, { useEffect, useState, useRef } from 'react';

import { send } from 'loot-core/src/platform/client/fetch';

import { colors } from '../../style';
import AnimatedLoading from '../../svg/AnimatedLoading';
import { Error } from '../alerts';
import Autocomplete from '../Autocomplete';
import { View, Modal, Button, P } from '../common';
import { FormField, FormLabel } from '../forms';

function useAvailableBanks() {
  const [banks, setBanks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      const results = await send('nordigen-get-banks');

      setBanks(
        results.map(({ id, name, country }) => ({
          id,
          name: country ? `${name} (${country})` : name,
        })),
      );
      setIsLoading(false);
    }

    fetch();
  }, [setBanks, setIsLoading]);

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
  let [error, setError] = useState(null);
  let data = useRef(null);
  const [bankFieldFocused, setbankFieldFocused] = useState(true);

  const { data: bankOptions, isLoading: isBankOptionsLoading } =
    useAvailableBanks();

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
        <FormField>
          <FormLabel title="Choose your bank:" htmlFor="bank-field" />
          <Autocomplete
            strict
            focused={bankFieldFocused}
            suggestions={bankOptions}
            onSelect={setInstitutionId}
            value={institutionId}
            inputProps={{
              id: 'bank-field',
              placeholder: '(please select)',
              onBlur: () => setbankFieldFocused(false),
              onFocus: () => setbankFieldFocused(true),
            }}
            renderItems={(items, getItemProps, highlightedIndex) => (
              <BankList
                items={items}
                getItemProps={getItemProps}
                highlightedIndex={highlightedIndex}
              />
            )}
          />
        </FormField>

        <Button
          primary
          style={{
            padding: '10px 0',
            fontSize: 15,
            fontWeight: 600,
            marginTop: 10,
          }}
          onClick={onJump}
          disabled={!institutionId}
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

          {waiting || isBankOptionsLoading ? (
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
                  : isBankOptionsLoading
                  ? 'Loading available banks...'
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

export function BankList({ items, getItemProps, highlightedIndex }) {
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
            'bank-item' + (highlightedIndex === idx ? '-highlighted' : '')
          }
        >
          {item.name}
        </div>
      ))}
    </View>
  );
}
