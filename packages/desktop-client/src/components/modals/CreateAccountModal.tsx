import React from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { InitialFocus } from '@actual-app/components/initial-focus';
import { Paragraph } from '@actual-app/components/paragraph';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { BuiltInProviders } from '#components/banksync/BuiltInProviders';
import { useBuiltInBankSyncProviders } from '#components/banksync/useBuiltInBankSyncProviders';
import { Link } from '#components/common/Link';
import { Modal, ModalCloseButton, ModalHeader } from '#components/common/Modal';
import { useNavigate } from '#hooks/useNavigate';
import { pushModal } from '#modals/modalsSlice';
import type { Modal as ModalType } from '#modals/modalsSlice';
import { useDispatch } from '#redux';

type CreateAccountModalProps = Extract<
  ModalType,
  { name: 'add-account' }
>['options'];

export function CreateAccountModal({
  upgradingAccountId,
}: CreateAccountModalProps) {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const {
    providers,
    syncServerStatus,
    showPermissionWarning,
    providersNeedingConfiguration,
  } = useBuiltInBankSyncProviders({ upgradingAccountId });

  const onCreateLocalAccount = () => {
    dispatch(pushModal({ modal: { name: 'add-local-account' } }));
  };

  let title = t('Add account');

  if (upgradingAccountId != null) {
    title = t('Link account');
  }

  return (
    <Modal name="add-account">
      {({ state }) => (
        <>
          <ModalHeader
            title={title}
            rightContent={<ModalCloseButton onPress={() => state.close()} />}
          />
          <View
            style={{
              maxWidth: upgradingAccountId == null ? 500 : 720,
              gap: 24,
              color: theme.pageText,
            }}
          >
            {upgradingAccountId != null ? (
              <>
                <Paragraph
                  style={{ fontSize: 15, color: theme.pageTextSubdued }}
                >
                  <Trans>
                    Choose a bank sync provider to connect this account.
                  </Trans>
                </Paragraph>
                <BuiltInProviders
                  providers={providers}
                  syncServerStatus={syncServerStatus}
                  showPermissionWarning={showPermissionWarning}
                  providersNeedingConfiguration={providersNeedingConfiguration}
                />
              </>
            ) : (
              <>
                <View style={{ gap: 10 }}>
                  <InitialFocus>
                    <Button
                      variant="primary"
                      style={{
                        padding: '10px 0',
                        fontSize: 15,
                        fontWeight: 600,
                      }}
                      onPress={onCreateLocalAccount}
                    >
                      <Trans>Create a local account</Trans>
                    </Button>
                  </InitialFocus>
                  <View style={{ lineHeight: '1.4em', fontSize: 15 }}>
                    <Text>
                      <Trans>
                        <strong>Create a local account</strong> if you want to
                        add transactions manually. You can also{' '}
                        <Link
                          variant="external"
                          to="https://actualbudget.org/docs/transactions/importing"
                          linkColor="muted"
                        >
                          import QIF/OFX/QFX files into a local account
                        </Link>
                        .
                      </Trans>
                    </Text>
                  </View>
                </View>

                <View style={{ gap: 10 }}>
                  <Button
                    onPress={() => {
                      state.close();
                      void navigate('/bank-sync');
                    }}
                    style={{
                      padding: '10px 0',
                      fontSize: 15,
                      fontWeight: 600,
                    }}
                  >
                    <Trans>Set up bank sync</Trans>
                  </Button>
                  <Paragraph
                    style={{ fontSize: 15, color: theme.pageTextSubdued }}
                  >
                    <Trans>
                      Configure providers and link accounts from the Bank Sync
                      page.
                    </Trans>
                  </Paragraph>
                </View>
              </>
            )}
          </View>
        </>
      )}
    </Modal>
  );
}
