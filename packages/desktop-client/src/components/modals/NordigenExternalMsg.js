import React, { useEffect, useState, useRef } from 'react';
import { useDispatch } from 'react-redux';

import { pushModal } from 'loot-core/src/client/actions/modals';
import { sendCatch } from 'loot-core/src/platform/client/fetch';

import useNordigenStatus from '../../hooks/useNordigenStatus';
import AnimatedLoading from '../../icons/AnimatedLoading';
import DotsHorizontalTriple from '../../icons/v1/DotsHorizontalTriple';
import { colors } from '../../style';
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

      const { data, error } = await sendCatch('nordigen-get-banks', country);

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

export default function NordigenExternalMsg({
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
  let [isNordigenSetupComplete, setIsNordigenSetupComplete] = useState(null);
  let [menuOpen, setMenuOpen] = useState(false);
  let data = useRef(null);

  const {
    data: bankOptions,
    isLoading: isBankOptionsLoading,
    isError: isBankOptionError,
  } = useAvailableBanks(country);
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

  const onNordigenInit = () => {
    dispatch(
      pushModal('nordigen-init', {
        onSuccess: () => setIsNordigenSetupComplete(true),
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
            Failed loading available banks: Nordigen access credentials might be
            misconfigured. Please{' '}
            <LinkButton
              onClick={onNordigenInit}
              style={{ color: colors.b3, display: 'inline' }}
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
          By enabling bank-sync, you will be granting Nordigen (a third party
          service) read-only access to your entire account’s transaction
          history. This service is not affiliated with Actual in any way. Make
          sure you’ve read and understand Nordigen’s{' '}
          <ExternalLink to="https://nordigen.com/en/company/privacy-policy/">
            Privacy Policy
          </ExternalLink>{' '}
          and{' '}
          <ExternalLink to="https://nordigen.com/en/company/privacy-policy-end-user/">
            End User Privacy Policy
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
              style={{ color: 'inherit', transform: 'rotateZ(90deg)' }}
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
                      onNordigenInit();
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
                backgroundColor: colors.g4,
                borderColor: colors.g4,
              }}
              onClick={onContinue}
            >
              Success! Click to continue &rarr;
            </Button>
          ) : isConfigured || isNordigenSetupComplete ? (
            renderLinkButton()
          ) : (
            <>
              <P style={{ color: colors.r5 }}>
                Nordigen integration has not yet been configured.
              </P>
              <Button primary onClick={onNordigenInit}>
                Configure Nordigen integration
              </Button>
            </>
          )}
        </View>
      )}
    </Modal>
  );
}
