// @ts-strict-ignore
import React, { useEffect, useRef, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { AnimatedLoading } from '@actual-app/components/icons/AnimatedLoading';
import { Paragraph } from '@actual-app/components/paragraph';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { sendCatch } from 'loot-core/platform/client/fetch';
import { type SophtronToken } from 'loot-core/types/models/sophtron';

import { Error, Warning } from '@desktop-client/components/alerts';
import { Autocomplete } from '@desktop-client/components/autocomplete/Autocomplete';
import { Link } from '@desktop-client/components/common/Link';
import {
  Modal,
  ModalCloseButton,
  ModalHeader,
} from '@desktop-client/components/common/Modal';
import { FormField, FormLabel } from '@desktop-client/components/forms';
import { useSophtronStatus } from '@desktop-client/hooks/useSophtronStatus';
import {
  pushModal,
  type Modal as ModalType,
} from '@desktop-client/modals/modalsSlice';
import { useDispatch } from '@desktop-client/redux';

type RawSophtronAccount = {
  AccountID: string;
  AccountName: string;
  AccountNumber?: string;
  AccountType: string;
  Balance?: number;
  customerId: string;
  InstitutionName?: string;
  UserInstitutionID?: string;
};

function useAvailableAccounts() {
  const [accounts, setAccounts] = useState<
    Array<{
      id: string;
      name: string;
      accountId: string;
      customerId: string;
      fullData: RawSophtronAccount;
    }>
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    async function fetch() {
      setIsError(false);
      setIsLoading(true);

      // Get all existing Sophtron accounts directly
      const { data, error } = await sendCatch('sophtron-get-all-accounts');

      if (error || !Array.isArray(data)) {
        setIsError(true);
        setAccounts([]);
      } else {
        setAccounts(
          data.map((acc: RawSophtronAccount) => ({
            id: acc.AccountID,
            name:
              acc.AccountName ||
              `${acc.AccountType} - ${acc.AccountNumber || acc.AccountID}`,
            accountId: acc.AccountID,
            customerId: acc.customerId,
            fullData: acc,
          })),
        );
      }

      setIsLoading(false);
    }

    fetch();
  }, []);

  return {
    data: accounts,
    isLoading,
    isError,
  };
}

function renderError(
  error: { code: 'unknown' | 'timeout'; message?: string },
  t: ReturnType<typeof useTranslation>['t'],
) {
  return (
    <Error style={{ alignSelf: 'center', marginBottom: 10 }}>
      {error.code === 'timeout'
        ? t('Timed out. Please try again.')
        : t(
            'An error occurred while linking your account, sorry! The potential issue could be: {{ message }}',
            { message: error.message },
          )}
    </Error>
  );
}

type SophtronExternalMsgModalProps = Extract<
  ModalType,
  { name: 'sophtron-external-msg' }
>['options'];

export function SophtronExternalMsgModal({
  onMoveExternal: _onMoveExternal,
  onSuccess,
  onClose,
}: SophtronExternalMsgModalProps) {
  const { t } = useTranslation();

  const dispatch = useDispatch();

  const [waiting, setWaiting] = useState<string | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<{
    accountId: string;
    customerId: string;
  }>();
  const [error, setError] = useState<{
    code: 'unknown' | 'timeout';
    message?: string;
  } | null>(null);
  const [isSophtronSetupComplete, setIsSophtronSetupComplete] = useState<
    boolean | null
  >(null);
  const data = useRef<SophtronToken | null>(null);

  const {
    data: accountOptions,
    isLoading: isAccountOptionsLoading,
    isError: isAccountOptionError,
  } = useAvailableAccounts();
  const {
    configuredSophtron: isConfigured,
    isLoading: isConfigurationLoading,
  } = useSophtronStatus();

  async function onJump() {
    if (!selectedAccount) return;

    setError(null);
    setWaiting('accounts');

    // Direct link - accounts are already available
    const selectedAccountData = accountOptions.find(
      acc => acc.accountId === selectedAccount.accountId,
    );

    if (selectedAccountData && selectedAccountData.fullData) {
      const acc = selectedAccountData.fullData;
      data.current = {
        id: selectedAccount.accountId,
        accounts: [
          {
            account_id: acc.AccountID,
            name: acc.AccountName,
            official_name: acc.AccountName,
            mask: acc.AccountNumber?.slice(-4) || acc.AccountID.slice(-4),
            balance: acc.Balance || 0,
            institution: acc.InstitutionName || 'Sophtron',
            orgId: selectedAccountData.customerId,
            orgDomain: acc.UserInstitutionID,
          },
        ],
      };

      await onSuccess(data.current);
    }

    setWaiting(null);
  }

  const onSophtronInit = () => {
    dispatch(
      pushModal({
        modal: {
          name: 'configure-sophtron',
          options: {
            onSuccess: () => setIsSophtronSetupComplete(true),
          },
        },
      }),
    );
  };

  const renderLinkButton = () => {
    return (
      <View style={{ gap: 10 }}>
        {isAccountOptionError ? (
          <Error>
            <Trans>
              Failed loading available accounts: Sophtron access credentials are
              not configured. Please configure them in{' '}
              <Link
                variant="text"
                onClick={onSophtronInit}
                style={{
                  color: theme.errorTextDark,
                  textDecoration: 'underline',
                }}
              >
                settings
              </Link>
              .
            </Trans>
          </Error>
        ) : (
          <>
            <FormField>
              <FormLabel
                title={t('Choose account to link:')}
                htmlFor="account-field"
              />
              <Autocomplete
                strict
                highlightFirst
                suggestions={accountOptions.map(account => ({
                  id: account.accountId,
                  name: account.name,
                }))}
                onSelect={accountId => {
                  const account = accountOptions.find(
                    acc => acc.accountId === accountId,
                  );
                  if (account) {
                    setSelectedAccount({
                      accountId: account.accountId,
                      customerId: account.customerId,
                    });
                  }
                }}
                value={selectedAccount?.accountId}
                inputProps={{
                  id: 'account-field',
                  placeholder: isAccountOptionsLoading
                    ? t('Loading accounts...')
                    : t('(please select)'),
                  disabled: isAccountOptionsLoading,
                }}
              />
            </FormField>

            <Paragraph style={{ fontSize: 13, color: theme.tableText }}>
              <Trans>
                Select an existing Sophtron account to link to Actual Budget.
              </Trans>
            </Paragraph>

            {error && renderError(error, t)}

            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'flex-end',
              }}
            >
              <Button
                variant="primary"
                isDisabled={!selectedAccount}
                onPress={onJump}
              >
                <Trans>Link account</Trans>
                {waiting === 'accounts' ? (
                  <AnimatedLoading
                    style={{ width: 16, height: 16, marginLeft: 5 }}
                  />
                ) : null}
              </Button>
            </View>
          </>
        )}
      </View>
    );
  };

  useEffect(() => {
    setIsSophtronSetupComplete(isConfigured);
  }, [isConfigured]);

  return (
    <Modal name="sophtron-external-msg" isLoading={isConfigurationLoading}>
      {() => (
        <>
          <ModalHeader
            title={t('Link Sophtron account')}
            rightContent={<ModalCloseButton onPress={onClose} />}
          />
          {!isConfigured && !isSophtronSetupComplete ? (
            <View style={{ gap: 10 }}>
              <Warning>
                <Trans>
                  Sophtron credentials are not configured. Please configure them
                  in{' '}
                  <Link
                    variant="text"
                    onClick={onSophtronInit}
                    style={{
                      color: theme.warningTextDark,
                      textDecoration: 'underline',
                    }}
                  >
                    settings
                  </Link>
                  .
                </Trans>
              </Warning>
            </View>
          ) : (
            renderLinkButton()
          )}
        </>
      )}
    </Modal>
  );
}
