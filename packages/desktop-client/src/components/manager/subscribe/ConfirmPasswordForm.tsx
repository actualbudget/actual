// @ts-strict-ignore
import React, { useState, type ChangeEvent, type ReactNode } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { ButtonWithLoading } from '@actual-app/components/button';
import { BigInput } from '@actual-app/components/input';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { css } from '@emotion/css';

type ConfirmPasswordFormProps = {
  buttons: ReactNode;
  onSetPassword: (password: string) => Promise<void>;
  onError: (error: string) => void;
};
export function ConfirmPasswordForm({
  buttons,
  onSetPassword,
  onError,
}: ConfirmPasswordFormProps) {
  const { t } = useTranslation();

  const [password1, setPassword1] = useState('');
  const [password2, setPassword2] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    if (loading) {
      return;
    }

    if (password1 === password2) {
      setLoading(true);
      await onSetPassword(password1);
      setLoading(false);
    } else {
      onError('password-match');
    }
  }

  function onShowPassword(e) {
    setShowPassword(e.target.checked);
  }

  return (
    <View
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        marginTop: 30,
      }}
    >
      <BigInput
        autoFocus
        placeholder={t('Password')}
        type={showPassword ? 'text' : 'password'}
        value={password1}
        onChangeValue={setPassword1}
        onEnter={onSubmit}
      />
      <BigInput
        placeholder={t('Confirm password')}
        type={showPassword ? 'text' : 'password'}
        value={password2}
        onChangeValue={setPassword2}
        style={{ marginTop: 10 }}
        onEnter={onSubmit}
      />

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          fontSize: 15,
          marginTop: 20,
        }}
      >
        <label style={{ userSelect: 'none' }}>
          <input type="checkbox" onChange={onShowPassword} />{' '}
          <Trans>Show password</Trans>
        </label>
        <View style={{ flex: 1 }} />
        {buttons}
        <ButtonWithLoading
          variant="primary"
          isLoading={loading}
          onPress={onSubmit}
        >
          <Trans>OK</Trans>
        </ButtonWithLoading>
      </View>
    </View>
  );
}

export function ConfirmOldPasswordForm({
  buttons,
  onSetPassword,
  style = null,
}) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();

  async function onSubmit() {
    if (loading) {
      return;
    }

    setLoading(true);
    await onSetPassword(password);
    setLoading(false);
  }

  function onShowPassword(e) {
    setShowPassword(e.target.checked);
  }

  return (
    <View
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        marginTop: 30,
        ...style,
      }}
    >
      <BigInput
        autoFocus
        placeholder={t('Password')}
        type={showPassword ? 'text' : 'password'}
        value={password}
        onChange={(e: ChangeEvent<HTMLInputElement>) =>
          setPassword(e.target.value)
        }
        onEnter={onSubmit}
        className={css({
          borderColor: theme.buttonMenuBorder,
          borderWidth: 1,
          borderStyle: 'solid',
          '&[data-focused]': {},
        })}
      />

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          fontSize: 15,
          marginTop: 20,
        }}
      >
        <label style={{ userSelect: 'none' }}>
          <input type="checkbox" onChange={onShowPassword} />{' '}
          <Trans>Show password</Trans>
        </label>
        <View style={{ flex: 1 }} />
        {buttons}
        <ButtonWithLoading
          variant="primary"
          isLoading={loading}
          onPress={onSubmit}
        >
          <Trans>OK</Trans>
        </ButtonWithLoading>
      </View>
    </View>
  );
}
