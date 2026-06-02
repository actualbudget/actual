import * as React from 'react';
import { useEffect, useRef, useState } from 'react';

import {
  AnimatedLoading,
  Button,
  FormError,
  Input,
  ModalCloseButton,
  ModalHeader,
  Text,
  View,
  type BankSyncProviderExternalAccount,
  type BankSyncProviderLinkRenderProps,
} from '@actual-app/plugins-core';

type Aspsp = {
  country: string;
  name: string;
  maximum_consent_validity?: number;
  beta?: boolean;
};

type BankOption = {
  id: string;
  name: string;
  country: string;
  aspspName: string;
  maxConsentValidity?: number;
};

function unwrapPluginResponse<T>(response: unknown): T {
  const typed = response as {
    status?: 'ok' | 'error';
    data?: T & { error?: string; error_code?: string; error_type?: string };
    error?: string;
    reason?: string;
  };

  if (typed.status === 'error') {
    throw new Error(typed.reason || typed.error || 'Plugin request failed');
  }

  if (typed.data?.error || typed.data?.error_code) {
    throw new Error(
      typed.data.error ||
        typed.data.error_type ||
        typed.data.error_code ||
        'Plugin request failed',
    );
  }

  return typed.data as T;
}

export function EnableBankingLink({
  callProvider,
  close,
  fileId,
  onError,
  openExternalUrl,
  selectExternalAccounts,
}: BankSyncProviderLinkRenderProps) {
  const [country, setCountry] = useState('GB');
  const [banks, setBanks] = useState<BankOption[]>([]);
  const [selectedAspsp, setSelectedAspsp] = useState<string>();
  const [isLoadingBanks, setIsLoadingBanks] = useState(false);
  const [waiting, setWaiting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const stateRef = useRef<string | null>(null);
  const jumpIdRef = useRef(0);

  async function loadBanks() {
    if (!country) {
      setBanks([]);
      return;
    }

    setIsLoadingBanks(true);
    setError(null);

    try {
      const result = unwrapPluginResponse<{ aspsps: Aspsp[] }>(
        await callProvider({
          path: 'aspsps',
          body: { country: country.toUpperCase() },
        }),
      );

      setBanks(
        result.aspsps.map(aspsp => ({
          id: `${aspsp.country}:${aspsp.name}`,
          country: aspsp.country,
          aspspName: aspsp.name,
          name: aspsp.beta ? `${aspsp.name} (beta)` : aspsp.name,
          maxConsentValidity: aspsp.maximum_consent_validity,
        })),
      );
      setSelectedAspsp(undefined);
    } catch (loadError) {
      const message =
        loadError instanceof Error ? loadError.message : String(loadError);
      setError(message);
      setBanks([]);
      onError(loadError);
    } finally {
      setIsLoadingBanks(false);
    }
  }

  useEffect(() => {
    void loadBanks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function stopPolling() {
    if (stateRef.current) {
      await callProvider({
        path: 'poll-auth-stop',
        body: { state: stateRef.current },
      });
      stateRef.current = null;
    }
  }

  async function onJump() {
    const selectedBank = banks.find(bank => bank.id === selectedAspsp);
    if (!selectedBank) {
      return;
    }

    const myJumpId = ++jumpIdRef.current;
    setError(null);
    setWaiting('browser');

    try {
      await stopPolling();

      const startData = unwrapPluginResponse<{ url: string; state: string }>(
        await callProvider({
          path: 'start-auth',
          body: {
            aspsp: {
              country: selectedBank.country,
              name: selectedBank.aspspName,
            },
            redirectUrl: `${window.location.origin}/enablebanking/auth_callback`,
            maxConsentValidity: selectedBank.maxConsentValidity,
          },
        }),
      );

      if (myJumpId !== jumpIdRef.current) return;

      stateRef.current = startData.state;
      localStorage.setItem('enablebanking_auth_state', startData.state);
      localStorage.setItem('enablebanking_auth_provider_slug', 'enablebanking-bank-sync');
      localStorage.setItem('enablebanking_auth_file_id', fileId);
      openExternalUrl(startData.url);

      const pollData = unwrapPluginResponse<{
        accounts: BankSyncProviderExternalAccount[];
      }>(
        await callProvider({
          path: 'poll-auth',
          body: { state: startData.state },
        }),
      );

      if (myJumpId !== jumpIdRef.current) return;

      localStorage.removeItem('enablebanking_auth_state');
      localStorage.removeItem('enablebanking_auth_provider_slug');
      localStorage.removeItem('enablebanking_auth_file_id');
      stateRef.current = null;
      setWaiting('accounts');
      selectExternalAccounts({ externalAccounts: pollData.accounts });
    } catch (linkError) {
      const message =
        linkError instanceof Error ? linkError.message : String(linkError);
      setError(message);
      onError(linkError);
    } finally {
      if (myJumpId === jumpIdRef.current) {
        setWaiting(null);
      }
    }
  }

  return (
    <>
      <ModalHeader
        title="Link Your Bank"
        rightContent={
          <ModalCloseButton
            onPress={() => {
              void stopPolling();
              close();
            }}
          />
        }
      />
      <View style={{ display: 'flex', gap: 12, padding: 20, minWidth: 420 }}>
        <Text>
          To link your bank account, you will be redirected to a new page where
          Enable Banking will ask to connect to your bank. Enable Banking will
          not be able to withdraw funds from your accounts.
        </Text>

        {error && <FormError>{error}</FormError>}

        {waiting ? (
          <View style={{ alignItems: 'center', gap: 8 }}>
            <AnimatedLoading style={{ width: 20, height: 20 }} />
            <Text>
              {waiting === 'browser'
                ? 'Waiting on Enable Banking...'
                : 'Loading accounts...'}
            </Text>
          </View>
        ) : (
          <>
            <View style={{ gap: 4 }}>
              <Text>Choose your country:</Text>
              <Input
                id="enablebanking-country-field"
                type="text"
                value={country}
                onChangeValue={setCountry}
                onBlur={() => {
                  void loadBanks();
                }}
              />
            </View>

            <Button
              variant="bare"
              type="button"
              isDisabled={isLoadingBanks}
              onPress={() => {
                void loadBanks();
              }}
            >
              {isLoadingBanks ? 'Loading banks...' : 'Load banks'}
            </Button>

            {banks.length > 0 && (
              <View style={{ gap: 6, maxHeight: 220, overflow: 'auto' }}>
                <Text>Choose your bank:</Text>
                {banks.map(bank => (
                  <Button
                    key={bank.id}
                    variant={selectedAspsp === bank.id ? 'primary' : 'bare'}
                    type="button"
                    onPress={() => setSelectedAspsp(bank.id)}
                  >
                    {bank.name}
                  </Button>
                ))}
              </View>
            )}

            <Text>
              By enabling bank sync, you will grant Enable Banking read-only
              access to your account transaction history. Make sure you have
              read and understand Enable Banking&apos;s{' '}
              <a
                href="https://enablebanking.com/privacy-policy/"
                target="_blank"
                rel="noreferrer"
              >
                Privacy Policy
              </a>{' '}
              before proceeding.
            </Text>

            <Button
              variant="primary"
              type="button"
              autoFocus
              isDisabled={!selectedAspsp || !country}
              onPress={() => {
                void onJump();
              }}
            >
              Link bank in browser
            </Button>
          </>
        )}
      </View>
    </>
  );
}
