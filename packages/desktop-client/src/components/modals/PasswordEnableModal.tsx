import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { closeBudget } from 'loot-core/client/budgets/budgetsSlice';
import {
  type Modal as ModalType,
  popModal,
} from 'loot-core/client/modals/modalsSlice';
import { send } from 'loot-core/platform/client/fetch';
import * as asyncStorage from 'loot-core/src/platform/server/asyncStorage';

import { useDispatch } from '../../redux';
import { theme, styles } from '../../style';
import { Error as ErrorAlert } from '../alerts';
import { Button } from '../common/Button2';
import { Label } from '../common/Label';
import { Modal, ModalCloseButton, ModalHeader } from '../common/Modal';
import { View } from '../common/View';
import { FormField } from '../forms';
import {
  ConfirmOldPasswordForm,
  ConfirmPasswordForm,
} from '../manager/subscribe/ConfirmPasswordForm';
import {
  useAvailableLoginMethods,
  useMultiuserEnabled,
  useRefreshLoginMethods,
} from '../ServerContext';

type PasswordEnableModalProps = Extract<
  ModalType,
  { name: 'enable-password-auth' }
>['options'];

export function PasswordEnableModal({
  onSave: originalOnSave,
}: PasswordEnableModalProps) {
  const { t } = useTranslation();
  const dispatch = useDispatch();

  const [error, setError] = useState<string | null>(null);
  const multiuserEnabled = useMultiuserEnabled();
  const availableLoginMethods = useAvailableLoginMethods();
  const refreshLoginMethods = useRefreshLoginMethods();

  const errorMessages = {
    'invalid-password': t('Invalid password'),
    'password-match': t('Passwords do not match'),
    'network-failure': t('Unable to contact the server'),
    'unable-to-change-file-config-enabled': t(
      'Unable to disable OpenID. Please update the config.json file in this case.',
    ),
  };

  function getErrorMessage(error: string): string {
    return (
      errorMessages[error as keyof typeof errorMessages] || t('Internal error')
    );
  }

  async function onSetPassword(password: string) {
    setError(null);
    const { error } = (await send('enable-password', { password })) || {};
    if (!error) {
      originalOnSave?.();
      await refreshLoginMethods();
      await asyncStorage.removeItem('user-token');
      await dispatch(closeBudget());
    } else {
      setError(getErrorMessage(error));
    }
  }

  return (
    <Modal name="enable-password-auth">
      {({ state: { close } }) => (
        <>
          <ModalHeader
            title={t('Revert to server password')}
            rightContent={<ModalCloseButton onPress={close} />}
          />

          <View style={{ flexDirection: 'column' }}>
            <FormField style={{ flex: 1 }}>
              {!availableLoginMethods.some(
                login => login.method === 'password',
              ) && (
                <ConfirmPasswordForm
                  buttons={
                    <Button
                      variant="bare"
                      style={{ fontSize: 15, marginRight: 10 }}
                      onPress={() => dispatch(popModal())}
                    >
                      <Trans>Cancel</Trans>
                    </Button>
                  }
                  onSetPassword={onSetPassword}
                  onError={(error: string) => setError(getErrorMessage(error))}
                />
              )}
              {availableLoginMethods.some(
                login => login.method === 'password',
              ) && (
                <ConfirmOldPasswordForm
                  buttons={
                    <Button
                      variant="bare"
                      style={{ fontSize: 15, marginRight: 10 }}
                      onPress={() => dispatch(popModal())}
                    >
                      <Trans>Cancel</Trans>
                    </Button>
                  }
                  onSetPassword={onSetPassword}
                />
              )}
            </FormField>
            <Label
              style={{
                ...styles.verySmallText,
                color: theme.pageTextLight,
                paddingTop: 5,
              }}
              title={t('Type the server password to disable OpenID')}
            />
            <Label
              style={{
                ...styles.verySmallText,
                color: theme.pageTextLight,
                paddingTop: 5,
              }}
              title={t('After disabling OpenID all sessions will be closed')}
            />
            {multiuserEnabled && (
              <Label
                style={{
                  ...styles.verySmallText,
                  color: theme.errorText,
                }}
                title={t('Multi-user will not work after disabling')}
              />
            )}
            {error && <ErrorAlert>{error}</ErrorAlert>}
          </View>
        </>
      )}
    </Modal>
  );
}
