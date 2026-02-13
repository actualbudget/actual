// @ts-strict-ignore
import React, { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { ButtonWithLoading } from '@actual-app/components/button';
import { InitialFocus } from '@actual-app/components/initial-focus';
import { Input } from '@actual-app/components/input';
import { Text } from '@actual-app/components/text';
import { View } from '@actual-app/components/view';

import { send } from 'loot-core/platform/client/fetch';
import { getSecretsError } from 'loot-core/shared/errors';

import { Error as AlertError } from '@desktop-client/components/alerts';
import { Link } from '@desktop-client/components/common/Link';
import {
  Modal,
  ModalButtons,
  ModalCloseButton,
  ModalHeader,
} from '@desktop-client/components/common/Modal';
import { FormField, FormLabel } from '@desktop-client/components/forms';
import type { Modal as ModalType } from '@desktop-client/modals/modalsSlice';

type ConfigureSophtronModalProps = Extract<
  ModalType,
  { name: 'configure-sophtron' }
>['options'];

export const ConfigureSophtronModal = ({
  onSuccess,
}: ConfigureSophtronModalProps) => {
  const { t } = useTranslation();
  const [userId, setUserId] = useState('');
  const [userKey, setUserKey] = useState('');
  const [isValid, setIsValid] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(
    t('It is required to provide both the User ID and Access Key.'),
  );

  const onSubmit = async (close: () => void) => {
    if (!userId || !userKey) {
      setIsValid(false);
      setError(t('It is required to provide both the User ID and Access Key.'));
      return;
    }

    setIsLoading(true);

    let { error, reason } =
      (await send('secret-set', {
        name: 'sophtron_userId',
        value: userId,
      })) || {};

    if (error) {
      setIsLoading(false);
      setIsValid(false);
      setError(getSecretsError(error, reason));
      return;
    } else {
      ({ error, reason } =
        (await send('secret-set', {
          name: 'sophtron_userKey',
          value: userKey,
        })) || {});
      if (error) {
        setIsLoading(false);
        setIsValid(false);
        setError(getSecretsError(error, reason));
        return;
      }
    }

    setIsValid(true);
    onSuccess();
    setIsLoading(false);
    close();
  };

  return (
    <Modal
      name="configure-sophtron"
      containerProps={{ style: { width: '30vw' } }}
    >
      {({ state: { close } }) => (
        <>
          <ModalHeader
            title={t('Set up Sophtron')}
            rightContent={<ModalCloseButton onPress={close} />}
          />
          <View style={{ display: 'flex', gap: 10 }}>
            <Text>
              <Trans>
                In order to enable bank sync via Sophtron you will need to
                create access credentials. This can be done by creating an
                account with{' '}
                <Link
                  variant="external"
                  to="https://www.sophtron.com"
                  linkColor="purple"
                >
                  Sophtron
                </Link>
                .
              </Trans>
            </Text>

            <FormField>
              <FormLabel title={t('User ID:')} htmlFor="user-id-field" />
              <InitialFocus>
                <Input
                  id="user-id-field"
                  type="password"
                  value={userId}
                  onChangeValue={value => {
                    setUserId(value);
                    setIsValid(true);
                  }}
                />
              </InitialFocus>
            </FormField>

            <FormField>
              <FormLabel title={t('Access Key:')} htmlFor="access-key-field" />
              <Input
                id="access-key-field"
                type="password"
                value={userKey}
                onChangeValue={value => {
                  setUserKey(value);
                  setIsValid(true);
                }}
              />
            </FormField>
            {!isValid && <AlertError>{error}</AlertError>}
          </View>

          <ModalButtons>
            <ButtonWithLoading
              variant="primary"
              isLoading={isLoading}
              onPress={() => {
                onSubmit(close);
              }}
            >
              <Trans>Save and continue</Trans>
            </ButtonWithLoading>
          </ModalButtons>
        </>
      )}
    </Modal>
  );
};
