// @ts-strict-ignore
import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { ButtonWithLoading } from '@actual-app/components/button';
import { InitialFocus } from '@actual-app/components/initial-focus';
import { Input } from '@actual-app/components/input';
import { Text } from '@actual-app/components/text';
import { View } from '@actual-app/components/view';

import { send } from 'loot-core/platform/client/fetch';

import { Error } from '@desktop-client/components/alerts';
import {
  Modal,
  ModalButtons,
  ModalCloseButton,
  ModalHeader,
} from '@desktop-client/components/common/Modal';
import { FormField, FormLabel } from '@desktop-client/components/forms';
import { type Modal as ModalType } from '@desktop-client/modals/modalsSlice';

type EnableBankingInitialiseModalProps = Extract<
  ModalType,
  { name: 'enablebanking-init' }
>['options'];

export const EnableBankingInitialiseModal = ({
  onSuccess,
}: EnableBankingInitialiseModalProps) => {
  const { t } = useTranslation();
  const [applicationId, setApplicationId] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [isValid, setIsValid] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(
    t('It is required to provide both the secret id and secret key.'),
  );

  const onSecretKey = file => {
    const reader = new FileReader();
    reader.onloadend = () => {
      setSecretKey(reader.result as string);
      setIsValid(true);
    };
    reader.readAsText(file);
  };

  const onSubmit = async (close: () => void) => {
    console.log('here we go.');
    if (!applicationId || !secretKey) {
      setIsValid(false);
      setError(
        t('It is required to provide both the application id and secret key.'),
      );
      return;
    }

    setIsLoading(true);

    const { error } = await send('enablebanking-configure', {
      secret: secretKey,
      applicationId,
    });
    if (error) {
      setIsLoading(false);
      setIsValid(false);
      switch (error.error_code) {
        case 'ENABLEBANKING_SECRETS_INVALID':
          setError(t('The provided credentials are not valid.'));
          break;
        case 'ENABLEBANKING_APPLICATION_INACTIVE':
          setError(
            t(
              'The Enable Banking application is inactive. Please create a new application.',
            ),
          );
          break;
        default:
          setError(t('Something went wrong. Please try again later.'));
      }
      return;
    }

    setIsValid(true);
    onSuccess();
    setIsLoading(false);
    close();
  };

  return (
    <Modal
      name="enablebanking-init"
      containerProps={{ style: { width: '30vw' } }}
    >
      {({ state: { close } }) => (
        <>
          <ModalHeader
            title={t('Set up Enable Banking')}
            rightContent={<ModalCloseButton onPress={close} />}
          />
          <View style={{ display: 'flex', gap: 10 }}>
            <Text>
              <Trans>
                In order to enable bank sync via Enable Banking (only for EU
                banks) you will need to create application credentials. .
              </Trans>
            </Text>

            <FormField>
              <FormLabel
                title={t('Application Id:')}
                htmlFor="secret-id-field"
              />
              <InitialFocus>
                <Input
                  id="application-id-field"
                  type="password"
                  value={applicationId}
                  onChangeValue={value => {
                    setApplicationId(value);
                    setIsValid(true);
                  }}
                />
              </InitialFocus>
            </FormField>

            <FormField>
              <FormLabel title={t('Secret Key:')} htmlFor="secret-key-field" />
              <Input
                id="secret-key-field"
                type="file"
                defaultValue=""
                accept=".pem"
                onChange={e => {
                  onSecretKey(e.target.files[0]);
                }}
              />
            </FormField>

            {!isValid && <Error>{error}</Error>}
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
