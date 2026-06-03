import * as React from 'react';
import { useEffect, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import {
  AnimatedLoading,
  Button,
  FormError,
  Input,
  ModalCloseButton,
  ModalHeader,
  Text,
  View,
} from '@actual-app/plugins-core';
import type {
  BankSyncProviderExternalAccount,
  BankSyncProviderLinkRenderProps,
} from '@actual-app/plugins-core';

type Institution = {
  id: string;
  name: string;
};

type PluginResponse<T> =
  | {
      status?: 'ok';
      data?: T;
    }
  | {
      status: 'error';
      error?: string;
      reason?: string;
    };

function unwrapPluginResponse<T>(response: unknown): T {
  const typed = response as PluginResponse<T>;
  if ('status' in typed && typed.status === 'error') {
    throw new Error(typed.reason || typed.error || 'Plugin request failed');
  }
  if ('data' in typed) {
    return typed.data as T;
  }
  return response as T;
}

export function GoCardlessLink({
  callProvider,
  close,
  fileId,
  onError,
  openExternalUrl,
  selectExternalAccounts,
}: BankSyncProviderLinkRenderProps) {
  const { t } = useTranslation();
  const [country, setCountry] = useState('GB');
  const [banks, setBanks] = useState<Institution[]>([]);
  const [institutionId, setInstitutionId] = useState('');
  const [isLoadingBanks, setIsLoadingBanks] = useState(false);
  const [isWaiting, setIsWaiting] = useState(false);
  const [isLinked, setIsLinked] = useState(false);
  const [requisitionId, setRequisitionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadBanks() {
    if (!country) {
      setBanks([]);
      return;
    }

    setIsLoadingBanks(true);
    setError(null);

    try {
      const data = unwrapPluginResponse<Institution[]>(
        await callProvider({
          path: 'banks',
          body: { country: country.toUpperCase(), fileId },
        }),
      );
      setBanks(data);
      setInstitutionId('');
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

  async function onJump() {
    if (!institutionId) {
      return;
    }

    setError(null);
    setIsWaiting(true);

    try {
      const token = unwrapPluginResponse<{
        link: string;
        requisitionId: string;
      }>(
        await callProvider({
          path: 'create-web-token',
          body: {
            institutionId,
            accessValidForDays: 90,
            host: window.location.origin,
          },
        }),
      );

      setRequisitionId(token.requisitionId);
      openExternalUrl(token.link);
      setIsLinked(true);
    } catch (linkError) {
      const message =
        linkError instanceof Error ? linkError.message : String(linkError);
      setError(message);
      onError(linkError);
    } finally {
      setIsWaiting(false);
    }
  }

  async function onContinue() {
    if (!requisitionId) {
      return;
    }

    setError(null);
    setIsWaiting(true);

    try {
      const data = unwrapPluginResponse<{
        id: string;
        accounts: BankSyncProviderExternalAccount[];
      }>(
        await callProvider({
          path: 'get-accounts',
          body: { requisitionId },
        }),
      );

      selectExternalAccounts({
        externalAccounts: data.accounts,
        bankId: data.id || requisitionId,
      });
    } catch (accountsError) {
      const message =
        accountsError instanceof Error
          ? accountsError.message
          : String(accountsError);
      setError(message);
      onError(accountsError);
    } finally {
      setIsWaiting(false);
    }
  }

  return (
    <>
      <ModalHeader
        title={t('Link Your Bank')}
        rightContent={<ModalCloseButton onPress={close} />}
      />
      <View style={{ display: 'flex', gap: 12, padding: 20, minWidth: 420 }}>
        <Text>
          To link your bank account, you will be redirected to a new page where
          GoCardless will ask to connect to your bank. GoCardless will not be
          able to withdraw funds from your accounts.
        </Text>

        {error && <FormError>{error}</FormError>}

        {isWaiting ? (
          <View style={{ alignItems: 'center', gap: 8 }}>
            <AnimatedLoading style={{ width: 20, height: 20 }} />
            <Text>Waiting on GoCardless...</Text>
          </View>
        ) : isLinked ? (
          <Button
            variant="primary"
            type="button"
            autoFocus
            onPress={() => {
              void onContinue();
            }}
          >
            <Trans>Success! Click to continue</Trans>
          </Button>
        ) : (
          <>
            <View style={{ gap: 4 }}>
              <Text>Choose your country:</Text>
              <Input
                id="gocardless-country-field"
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
              {isLoadingBanks ? 'Loading banks...' : t('Load banks')}
            </Button>

            {banks.length > 0 && (
              <View style={{ gap: 6, maxHeight: 220, overflow: 'auto' }}>
                <Text>Choose your bank:</Text>
                {banks.map(bank => (
                  <Button
                    key={bank.id}
                    variant={institutionId === bank.id ? 'primary' : 'bare'}
                    type="button"
                    onPress={() => setInstitutionId(bank.id)}
                  >
                    {bank.name}
                  </Button>
                ))}
              </View>
            )}

            <Text>
              By enabling bank sync, you will be granting GoCardless read-only
              access to your account transaction history. Make sure you have
              read and understand GoCardless&apos;s{' '}
              <a
                href="https://gocardless.com/privacy/"
                target="_blank"
                rel="noreferrer"
              >
                <Trans>Privacy Policy</Trans>
              </a>{' '}
              before proceeding.
            </Text>

            <Button
              variant="primary"
              type="button"
              autoFocus
              isDisabled={!institutionId}
              onPress={() => {
                void onJump();
              }}
            >
              <Trans>Link bank in browser</Trans>
            </Button>
          </>
        )}
      </View>
    </>
  );
}
