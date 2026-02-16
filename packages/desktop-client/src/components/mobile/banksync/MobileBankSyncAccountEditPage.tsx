import React from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useParams } from 'react-router';

import { Button } from '@actual-app/components/button';
import { SpaceBetween } from '@actual-app/components/space-between';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { useUnlinkAccountMutation } from '@desktop-client/accounts';
import { BankSyncCheckboxOptions } from '@desktop-client/components/banksync/BankSyncCheckboxOptions';
import { FieldMapping } from '@desktop-client/components/banksync/FieldMapping';
import { useBankSyncAccountSettings } from '@desktop-client/components/banksync/useBankSyncAccountSettings';
import { MobileBackButton } from '@desktop-client/components/mobile/MobileBackButton';
import { MobilePageHeader, Page } from '@desktop-client/components/Page';
import { useAccount } from '@desktop-client/hooks/useAccount';
import { useNavigate } from '@desktop-client/hooks/useNavigate';
import { pushModal } from '@desktop-client/modals/modalsSlice';
import { useDispatch } from '@desktop-client/redux';

export function MobileBankSyncAccountEditPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { accountId } = useParams<{ accountId: string }>();
  const account = useAccount(accountId!);

  const {
    transactionDirection,
    setTransactionDirection,
    importPending,
    setImportPending,
    importNotes,
    setImportNotes,
    reimportDeleted,
    setReimportDeleted,
    importTransactions,
    setImportTransactions,
    updateDates,
    setUpdateDates,
    mappings,
    setMapping,
    fields,
    saveSettings,
  } = useBankSyncAccountSettings(accountId!);

  const handleCancel = () => {
    navigate('/bank-sync');
  };

  const handleSave = async () => {
    saveSettings();
    navigate('/bank-sync');
  };

  const unlinkAccount = useUnlinkAccountMutation();
  const handleUnlink = () => {
    dispatch(
      pushModal({
        modal: {
          name: 'confirm-unlink-account',
          options: {
            accountName: account?.name || '',
            isViewBankSyncSettings: true,
            onUnlink: () => {
              if (accountId) {
                unlinkAccount.mutate(
                  { id: accountId },
                  {
                    onSuccess: () => navigate('/bank-sync'),
                  },
                );
              }
            },
          },
        },
      }),
    );
  };

  if (!account) {
    return (
      <Page
        header={
          <MobilePageHeader
            title={t('Account not found')}
            leftContent={<MobileBackButton onPress={handleCancel} />}
          />
        }
        padding={0}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: theme.mobilePageBackground,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Text>
            <Trans>Account not found</Trans>
          </Text>
        </View>
      </Page>
    );
  }

  const mapping =
    mappings.get(transactionDirection) ?? new Map<string, string>();

  return (
    <Page
      header={
        <MobilePageHeader
          title={account.name}
          leftContent={<MobileBackButton onPress={handleCancel} />}
        />
      }
      padding={0}
    >
      <View style={{ flex: 1, backgroundColor: theme.mobilePageBackground }}>
        <View
          style={{
            flex: 1,
            overflow: 'auto',
          }}
        >
          <View style={{ padding: 16 }}>
            <Text style={{ fontSize: 15, marginBottom: 10 }}>
              <Trans>Field mapping</Trans>
            </Text>

            <FieldMapping
              transactionDirection={transactionDirection}
              setTransactionDirection={setTransactionDirection}
              fields={fields}
              mapping={mapping}
              setMapping={setMapping}
              isMobile
            />

            <Text style={{ fontSize: 15, marginTop: 20, marginBottom: 10 }}>
              <Trans>Options</Trans>
            </Text>

            <BankSyncCheckboxOptions
              importPending={importPending}
              setImportPending={setImportPending}
              importNotes={importNotes}
              setImportNotes={setImportNotes}
              reimportDeleted={reimportDeleted}
              setReimportDeleted={setReimportDeleted}
              importTransactions={importTransactions}
              setImportTransactions={setImportTransactions}
              updateDates={updateDates}
              setUpdateDates={setUpdateDates}
              helpMode="mobile"
            />
          </View>
        </View>

        <View
          style={{
            padding: 16,
            paddingTop: 12,
            borderTop: `1px solid ${theme.tableBorder}`,
            backgroundColor: theme.mobilePageBackground,
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Button
            style={{
              color: theme.errorText,
            }}
            onPress={handleUnlink}
          >
            <Trans>Unlink account</Trans>
          </Button>

          <SpaceBetween gap={10}>
            <Button onPress={handleCancel}>
              <Trans>Cancel</Trans>
            </Button>
            <Button variant="primary" onPress={handleSave}>
              <Trans>Save</Trans>
            </Button>
          </SpaceBetween>
        </View>
      </View>
    </Page>
  );
}
