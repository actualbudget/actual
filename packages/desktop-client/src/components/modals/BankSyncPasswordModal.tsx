// @ts-strict-ignore
import React, { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { ButtonWithLoading } from '@actual-app/components/button';
import { Input } from '@actual-app/components/input';
import { Text } from '@actual-app/components/text';
import { View } from '@actual-app/components/view';

import { Error } from '@desktop-client/components/alerts';
import {
  Modal,
  ModalButtons,
  ModalCloseButton,
  ModalHeader,
} from '@desktop-client/components/common/Modal';
import { FormField, FormLabel } from '@desktop-client/components/forms';
import { type Modal as ModalType } from '@desktop-client/modals/modalsSlice';

type BankSyncPasswordModalProps = Extract<
  ModalType,
  { name: 'bank-sync-password' }
>['options'];

export function BankSyncPasswordModal({
  providers,
  onSubmit: onSubmitProp,
}: BankSyncPasswordModalProps) {
  const { t } = useTranslation();
  const [passwords, setPasswords] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const onSubmit = (close: () => void) => {
    const missing = providers.filter(p => !passwords[p.slug]?.trim?.());
    if (missing.length > 0) {
      setError(
        t('Please enter the encryption password for each provider listed.'),
      );
      return;
    }
    setError(null);
    setIsLoading(true);
    const map: Record<string, string> = {};
    for (const p of providers) {
      map[p.slug] = passwords[p.slug]?.trim() ?? '';
    }
    onSubmitProp(map);
    setIsLoading(false);
    close();
  };

  return (
    <Modal name="bank-sync-password" containerProps={{ style: { width: 400 } }}>
      {({ state: { close } }) => (
        <>
          <ModalHeader
            title={t('Bank sync encryption passwords')}
            rightContent={<ModalCloseButton onPress={close} />}
          />
          <View style={{ display: 'flex', gap: 12 }}>
            <Text>
              <Trans>
                The following providers have encrypted secrets. Enter the
                encryption password for each to continue syncing.
              </Trans>
            </Text>
            {providers.map(provider => (
              <FormField key={provider.slug}>
                <FormLabel
                  title={`${provider.displayName}:`}
                  htmlFor={`bank-sync-pwd-${provider.slug}`}
                />
                <Input
                  id={`bank-sync-pwd-${provider.slug}`}
                  type="password"
                  value={passwords[provider.slug] ?? ''}
                  onChangeValue={value => {
                    setPasswords(prev => ({ ...prev, [provider.slug]: value }));
                    setError(null);
                  }}
                />
              </FormField>
            ))}
            {error != null && <Error>{error}</Error>}
          </View>
          <ModalButtons>
            <ButtonWithLoading
              variant="primary"
              isLoading={isLoading}
              onPress={() => onSubmit(close)}
            >
              <Trans>Continue sync</Trans>
            </ButtonWithLoading>
          </ModalButtons>
        </>
      )}
    </Modal>
  );
}
