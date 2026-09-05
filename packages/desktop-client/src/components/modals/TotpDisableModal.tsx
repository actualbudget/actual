import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button, ButtonWithLoading } from '@actual-app/components/button';
import { Input } from '@actual-app/components/input';
import { Label } from '@actual-app/components/label';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { send } from '@actual-app/core/platform/client/connection';

import { Error as ErrorAlert } from '#components/alerts';
import {
  Modal,
  ModalButtons,
  ModalCloseButton,
  ModalHeader,
} from '#components/common/Modal';
import { FormField, FormLabel } from '#components/forms';
import { popModal } from '#modals/modalsSlice';
import type { Modal as ModalType } from '#modals/modalsSlice';
import { useDispatch } from '#redux';

type TotpDisableModalProps = Extract<
  ModalType,
  { name: 'disable-totp' }
>['options'];

export function TotpDisableModal({ onSave }: TotpDisableModalProps) {
  const { t } = useTranslation();
  const dispatch = useDispatch();

  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const errorMessages: Record<string, string> = {
    'invalid-password': t('Invalid password'),
    'invalid-totp-code': t('That code is not valid. Please try again.'),
    'totp-not-enabled': t('Two-factor authentication is already disabled.'),
    'too-many-requests': t('Too many attempts. Please wait and try again.'),
    'network-failure': t('Unable to contact the server'),
  };

  function getErrorMessage(error: string): string {
    return errorMessages[error] || t('Internal error');
  }

  async function onDisable() {
    if (password === '' || code.trim() === '' || loading) {
      return;
    }

    setError(null);
    setLoading(true);
    const { error } =
      (await send('totp-disable', { password, code: code.trim() })) || {};
    setLoading(false);

    if (error) {
      setError(getErrorMessage(error));
      return;
    }

    onSave?.();
    dispatch(popModal());
  }

  return (
    <Modal name="disable-totp">
      {({ state }) => (
        <>
          <ModalHeader
            title={t('Disable two-factor authentication')}
            rightContent={<ModalCloseButton onPress={() => state.close()} />}
          />

          <View style={{ flexDirection: 'column', gap: 10 }}>
            <Text>
              <Trans>
                Confirm with your server password and a current code from your
                authenticator app.
              </Trans>
            </Text>

            <FormField>
              <FormLabel title={t('Password:')} htmlFor="totp-password-field" />
              <Input
                id="totp-password-field"
                autoFocus
                type="password"
                value={password}
                onChangeValue={setPassword}
              />
            </FormField>

            <FormField>
              <FormLabel title={t('Code:')} htmlFor="totp-code-field" />
              <Input
                id="totp-code-field"
                inputMode="numeric"
                value={code}
                onChangeValue={setCode}
                onEnter={onDisable}
              />
            </FormField>

            <Label
              style={{
                ...styles.verySmallText,
                color: theme.errorText,
              }}
              title={t('Your server will be protected by the password alone')}
            />

            {error && <ErrorAlert>{error}</ErrorAlert>}
          </View>

          <ModalButtons>
            <Button
              style={{ marginRight: 10 }}
              onPress={() => dispatch(popModal())}
            >
              <Trans>Cancel</Trans>
            </Button>
            <ButtonWithLoading
              variant="primary"
              isLoading={loading}
              onPress={onDisable}
            >
              <Trans>Disable</Trans>
            </ButtonWithLoading>
          </ModalButtons>
        </>
      )}
    </Modal>
  );
}
