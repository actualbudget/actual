import React, { useEffect, useEffectEvent, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button, ButtonWithLoading } from '@actual-app/components/button';
import { AnimatedLoading } from '@actual-app/components/icons/AnimatedLoading';
import { Input } from '@actual-app/components/input';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { send } from '@actual-app/core/platform/client/connection';
import type {
  FinTSBank,
  FinTSConnection,
  FinTSConnectionInput,
  FinTSStatus,
} from '@actual-app/core/types/models';

import { Error as ErrorAlert } from '#components/alerts';
import { FinTSBankSearch } from '#components/banksync/FinTSBankSearch';
import {
  Modal,
  ModalButtons,
  ModalCloseButton,
  ModalHeader,
} from '#components/common/Modal';
import { FormField, FormLabel } from '#components/forms';
import { authorizeFinTS } from '#fints';
import { pushModal } from '#modals/modalsSlice';
import type { Modal as ModalType } from '#modals/modalsSlice';
import { useDispatch } from '#redux';

type FinTSConnectModalProps = Extract<
  ModalType,
  { name: 'fints-connect' }
>['options'];

const EMPTY_FORM: FinTSConnectionInput = {
  name: '',
  blz: '',
  url: '',
  userId: '',
  customerId: '',
};

export function FinTSConnectModal({
  upgradingAccountId,
}: FinTSConnectModalProps) {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const [status, setStatus] = useState<FinTSStatus | null>(null);
  const [form, setForm] = useState<FinTSConnectionInput | null>(null);
  // What is typed into the bank field: a bank code or part of a bank name.
  const [bankQuery, setBankQuery] = useState('');
  // The FinTS address comes from the bank list unless the user enters one,
  // or the bank is not listed.
  const [isCustomUrl, setIsCustomUrl] = useState(false);
  const [isBankUnlisted, setIsBankUnlisted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);

  async function loadStatus() {
    const result = await send('fints-status');
    if ('error' in result) {
      setError(result.reason ?? t('Could not load your bank logins.'));
      return;
    }
    setStatus(result);
    if (result.connections.length === 0) {
      openForm(EMPTY_FORM);
    }
  }

  const onOpen = useEffectEvent(() => {
    void loadStatus();
  });
  useEffect(() => {
    onOpen();
  }, []);

  async function lookupBank(blz: string, keepUrl: boolean) {
    if (!status?.bankListAvailable || !/^\d{8}$/.test(blz)) {
      return;
    }
    const result = await send('fints-bank-lookup', { blz });
    // On a failed lookup the bank is unknown, not missing from the list.
    if ('error' in result || !('bank' in result)) {
      return;
    }
    const bank = result.bank;
    setForm(current => {
      // Ignore the answer for a code that was changed in the meantime.
      if (!current || current.blz !== blz) {
        return current;
      }
      if (!bank) {
        return current;
      }
      return {
        ...current,
        url: keepUrl ? current.url : bank.url,
        name: current.name || bank.name,
      };
    });
    if (!bank) {
      setIsBankUnlisted(true);
      setIsCustomUrl(true);
    }
  }

  async function saveForm() {
    if (!form) return;
    setError(null);
    setBusyId('form');
    const result = await send('fints-connection-save', {
      connection: {
        ...form,
        customerId: form.customerId?.trim() || undefined,
      },
    });
    setBusyId(null);

    if ('error' in result) {
      setError(result.reason ?? t('Could not save the bank login.'));
      return;
    }
    if ('error_code' in result) {
      if (result.error_code === 'BANK_URL_REQUIRED') {
        setIsBankUnlisted(true);
        setIsCustomUrl(true);
        setError(t('Enter the FinTS server address of your bank.'));
      } else {
        setError(
          result.error_code === 'BANK_URL_BLOCKED'
            ? t('The bank address must be a public https address.')
            : t('Check the entered values.'),
        );
      }
      return;
    }

    setForm(null);
    await loadStatus();
  }

  async function removeConnection(connection: FinTSConnection) {
    if (confirmRemoveId !== connection.id) {
      setConfirmRemoveId(connection.id);
      return;
    }
    setConfirmRemoveId(null);
    setBusyId(connection.id);
    await send('fints-connection-remove', { connectionId: connection.id });
    setBusyId(null);
    await loadStatus();
  }

  async function connect(connection: FinTSConnection) {
    setError(null);
    setBusyId(connection.id);
    try {
      const isReady = await authorizeFinTS(dispatch, {
        connectionId: connection.id,
        connectionName: connection.name,
        refresh: true,
      });
      if (!isReady) {
        return;
      }

      const result = await send('fints-accounts', {
        connectionId: connection.id,
      });
      if ('error' in result) {
        setError(result.reason ?? t('Could not load the accounts.'));
        return;
      }
      if ('error_code' in result || result.accounts.length === 0) {
        setError(t('Your bank did not report any accounts for this login.'));
        return;
      }

      dispatch(
        pushModal({
          modal: {
            name: 'select-linked-accounts',
            options: {
              externalAccounts: result.accounts,
              syncSource: 'fints',
              upgradingAccountId,
            },
          },
        }),
      );
    } finally {
      setBusyId(null);
    }
  }

  function openForm(next: FinTSConnectionInput) {
    setForm(next);
    setBankQuery(next.blz);
    setIsCustomUrl(false);
    setIsBankUnlisted(false);
  }

  function onBankQueryChange(text: string) {
    setBankQuery(text);
    // The address field opened only because the previous bank was not
    // listed; a different bank gets its address from the list again.
    const keepUrl = isCustomUrl && !isBankUnlisted;
    setIsBankUnlisted(false);
    setIsCustomUrl(keepUrl);
    const blz = text.trim();
    // Only a complete bank code counts; a half-typed name must not be saved.
    const isCompleteCode = /^\d{8}$/.test(blz);
    updateForm({
      blz: isCompleteCode ? blz : '',
      // An address from the bank list belongs to the previous bank.
      ...(keepUrl ? {} : { url: '' }),
    });
    if (isCompleteCode) {
      void lookupBank(blz, keepUrl);
    }
  }

  function selectBank(bank: FinTSBank) {
    setBankQuery(bank.blz);
    setIsCustomUrl(false);
    setIsBankUnlisted(false);
    setForm(current =>
      current
        ? {
            ...current,
            blz: bank.blz,
            url: bank.url,
            name: current.name || bank.name,
          }
        : current,
    );
  }

  function updateForm(update: Partial<FinTSConnectionInput>) {
    setForm(current => (current ? { ...current, ...update } : current));
  }

  return (
    <Modal name="fints-connect" containerProps={{ style: { width: 480 } }}>
      {({ state }) => (
        <>
          <ModalHeader
            title={t('FinTS bank logins')}
            rightContent={<ModalCloseButton onPress={() => state.close()} />}
          />
          <View style={{ display: 'flex', gap: 10 }}>
            {status == null && !error && (
              <View style={{ alignItems: 'center', padding: 10 }}>
                <AnimatedLoading style={{ width: 20, height: 20 }} />
              </View>
            )}

            {status && !form && (
              <>
                <Text>
                  <Trans>
                    Choose the bank login whose accounts you want to link.
                  </Trans>
                </Text>
                {status.connections.map(connection => (
                  <View
                    key={connection.id}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 8,
                      padding: 8,
                      border: `1px solid ${theme.tableBorder}`,
                      borderRadius: 4,
                    }}
                  >
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={{ fontWeight: 600 }}>{connection.name}</Text>
                      <Text style={{ color: theme.pageTextSubdued }}>
                        {connection.bankName ?? connection.blz} ·{' '}
                        {connection.userId}
                      </Text>
                    </View>
                    <Button
                      variant="bare"
                      onPress={() =>
                        openForm({
                          id: connection.id,
                          name: connection.name,
                          blz: connection.blz,
                          url: connection.url,
                          userId: connection.userId,
                          customerId: connection.customerId ?? '',
                        })
                      }
                    >
                      <Trans>Edit</Trans>
                    </Button>
                    <Button
                      variant="bare"
                      onPress={() => void removeConnection(connection)}
                    >
                      {confirmRemoveId === connection.id ? (
                        <Trans>Confirm removal</Trans>
                      ) : (
                        <Trans>Remove</Trans>
                      )}
                    </Button>
                    <ButtonWithLoading
                      variant="primary"
                      isLoading={busyId === connection.id}
                      isDisabled={busyId != null}
                      onPress={() => void connect(connection)}
                    >
                      <Trans>Link accounts</Trans>
                    </ButtonWithLoading>
                  </View>
                ))}
              </>
            )}

            {form && (
              <>
                <Text>
                  <Trans>
                    Enter the login you use for online banking. Your PIN is
                    asked for when connecting.
                  </Trans>
                </Text>
                <FormField>
                  {status?.bankListAvailable ? (
                    <>
                      <FormLabel
                        title={t('Bank (name or bank code):')}
                        htmlFor="fints-blz-field"
                      />
                      <FinTSBankSearch
                        id="fints-blz-field"
                        value={bankQuery}
                        onChangeValue={onBankQueryChange}
                        onSelectBank={selectBank}
                      />
                    </>
                  ) : (
                    <>
                      <FormLabel
                        title={t('Bank code (BLZ):')}
                        htmlFor="fints-blz-field"
                      />
                      <Input
                        id="fints-blz-field"
                        inputMode="numeric"
                        value={form.blz}
                        onChangeValue={blz => updateForm({ blz: blz.trim() })}
                      />
                    </>
                  )}
                </FormField>
                {status?.bankListAvailable && !isCustomUrl ? (
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <Text
                      style={{
                        flex: 1,
                        minWidth: 0,
                        color: theme.pageTextSubdued,
                        overflowWrap: 'anywhere',
                      }}
                    >
                      {form.url ? (
                        <Trans>FinTS server address: {{ url: form.url }}</Trans>
                      ) : (
                        <Trans>
                          The FinTS server address is taken from the bank list.
                        </Trans>
                      )}
                    </Text>
                    <Button variant="bare" onPress={() => setIsCustomUrl(true)}>
                      <Trans>Use a different address</Trans>
                    </Button>
                  </View>
                ) : (
                  <FormField>
                    <FormLabel
                      title={t('FinTS server address:')}
                      htmlFor="fints-url-field"
                    />
                    <Input
                      id="fints-url-field"
                      placeholder="https://"
                      value={form.url}
                      onChangeValue={url => updateForm({ url })}
                    />
                    {isBankUnlisted && (
                      <Text style={{ color: theme.pageTextSubdued }}>
                        <Trans>
                          This bank is not in the FinTS bank list. Enter the
                          address your bank publishes for FinTS.
                        </Trans>
                      </Text>
                    )}
                    {!status?.bankListAvailable && (
                      <Text style={{ color: theme.pageTextSubdued }}>
                        <Trans>
                          Your bank publishes this address, often as "FinTS" or
                          "HBCI PIN/TAN" address.
                        </Trans>
                      </Text>
                    )}
                  </FormField>
                )}
                <FormField>
                  <FormLabel title={t('Name:')} htmlFor="fints-name-field" />
                  <Input
                    id="fints-name-field"
                    value={form.name}
                    onChangeValue={name => updateForm({ name })}
                  />
                </FormField>
                <FormField>
                  <FormLabel
                    title={t('Login name or ID:')}
                    htmlFor="fints-user-field"
                  />
                  <Input
                    id="fints-user-field"
                    autoComplete="off"
                    value={form.userId}
                    onChangeValue={userId => updateForm({ userId })}
                  />
                </FormField>
                <FormField>
                  <FormLabel
                    title={t('Customer ID (only if your bank gave you one):')}
                    htmlFor="fints-customer-field"
                  />
                  <Input
                    id="fints-customer-field"
                    autoComplete="off"
                    value={form.customerId ?? ''}
                    onChangeValue={customerId => updateForm({ customerId })}
                  />
                </FormField>
              </>
            )}

            {error && <ErrorAlert>{error}</ErrorAlert>}
          </View>

          <ModalButtons>
            {form ? (
              <>
                {status && status.connections.length > 0 && (
                  <Button onPress={() => setForm(null)}>
                    <Trans>Back</Trans>
                  </Button>
                )}
                <ButtonWithLoading
                  variant="primary"
                  style={{ marginLeft: 10 }}
                  isLoading={busyId === 'form'}
                  isDisabled={
                    !form.name ||
                    !form.blz ||
                    !form.userId ||
                    // With the bank list, the server fills in the address.
                    ((!status?.bankListAvailable || isCustomUrl) && !form.url)
                  }
                  onPress={() => void saveForm()}
                >
                  <Trans>Save</Trans>
                </ButtonWithLoading>
              </>
            ) : (
              status && (
                <Button onPress={() => openForm(EMPTY_FORM)}>
                  <Trans>Add bank login</Trans>
                </Button>
              )
            )}
          </ModalButtons>
        </>
      )}
    </Modal>
  );
}
