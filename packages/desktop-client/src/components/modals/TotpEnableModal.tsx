import { useEffect, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button, ButtonWithLoading } from '@actual-app/components/button';
import { Input } from '@actual-app/components/input';
import { Label } from '@actual-app/components/label';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { send } from '@actual-app/core/platform/client/connection';
import QRCode from 'qrcode';

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

type TotpEnableModalProps = Extract<
  ModalType,
  { name: 'enable-totp' }
>['options'];

export function TotpEnableModal({ onSave }: TotpEnableModalProps) {
  const { t } = useTranslation();
  const dispatch = useDispatch();

  const [secret, setSecret] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const errorMessages: Record<string, string> = {
    'invalid-totp-code': t('That code is not valid. Please try again.'),
    'totp-not-enrolled': t('Enrollment expired. Please start again.'),
    'totp-already-enabled': t('Two-factor authentication is already enabled.'),
    'totp-not-available': t(
      'Two-factor authentication is only available with password authentication.',
    ),
    'mfa-client-unsupported': t(
      'This version of Actual is too old to use two-factor authentication. Please update it.',
    ),
    'too-many-requests': t('Too many attempts. Please wait and try again.'),
    'network-failure': t('Unable to contact the server'),
  };

  function getErrorMessage(error: string): string {
    return errorMessages[error] || t('Internal error');
  }

  useEffect(() => {
    let cancelled = false;

    async function enroll() {
      const res = await send('totp-enroll');

      if (cancelled) {
        return;
      }

      if ('error' in res) {
        setError(res.error);
        return;
      }

      setSecret(res.secret);
      setQrDataUrl(await QRCode.toDataURL(res.otpauthUrl));
    }

    void enroll();

    return () => {
      cancelled = true;
    };
  }, []);

  async function onConfirm() {
    if (code.trim() === '' || loading) {
      return;
    }

    setError(null);
    setLoading(true);
    const { error } = (await send('totp-confirm', { code: code.trim() })) || {};
    setLoading(false);

    if (error) {
      setError(error);
      return;
    }

    onSave?.();
    dispatch(popModal());
  }

  return (
    <Modal name="enable-totp" containerProps={{ style: { width: 500 } }}>
      {({ state }) => (
        <>
          <ModalHeader
            title={t('Enable two-factor authentication')}
            rightContent={<ModalCloseButton onPress={() => state.close()} />}
          />

          <View style={{ flexDirection: 'column', gap: 10 }}>
            <Text>
              <Trans>
                Scan this code with an authenticator app, then enter the code it
                shows to confirm it works.
              </Trans>
            </Text>

            {qrDataUrl && (
              <View style={{ alignItems: 'center' }}>
                <img
                  src={qrDataUrl}
                  alt={t('Two-factor authentication QR code')}
                  width={200}
                  height={200}
                  style={{ borderRadius: 4 }}
                />
              </View>
            )}

            {secret && (
              <View>
                <Label
                  style={{
                    ...styles.verySmallText,
                    color: theme.pageTextLight,
                  }}
                  title={t('Or enter this key manually:')}
                />
                <Text
                  style={{
                    ...styles.verySmallText,
                    fontFamily: 'monospace',
                    userSelect: 'all',
                    wordBreak: 'break-all',
                  }}
                >
                  {secret}
                </Text>
              </View>
            )}

            <FormField>
              <FormLabel title={t('Code:')} htmlFor="totp-code-field" />
              <Input
                id="totp-code-field"
                autoFocus
                inputMode="numeric"
                value={code}
                onChangeValue={setCode}
                onEnter={onConfirm}
              />
            </FormField>

            <Label
              style={{
                ...styles.verySmallText,
                color: theme.pageTextLight,
              }}
              title={t(
                'Keep a copy of the key somewhere safe. If you lose your authenticator app, run the disable-totp script on the server to get back in',
              )}
            />

            <Label
              style={{
                ...styles.verySmallText,
                color: theme.warningText,
              }}
              title={t('Older versions of Actual will not be able to sign in')}
            />

            {error && <ErrorAlert>{getErrorMessage(error)}</ErrorAlert>}
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
              isDisabled={!secret}
              onPress={onConfirm}
            >
              <Trans>Enable</Trans>
            </ButtonWithLoading>
          </ModalButtons>
        </>
      )}
    </Modal>
  );
}
