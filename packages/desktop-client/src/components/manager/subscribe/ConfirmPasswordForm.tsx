// @ts-strict-ignore
import React, { type ChangeEvent, useState } from 'react';

import { ButtonWithLoading } from '../../common/Button';
import { BigInput } from '../../common/Input';
import { View } from '../../common/View';

export function ConfirmPasswordForm({ buttons, onSetPassword, onError }) {
  const [password1, setPassword1] = useState('');
  const [password2, setPassword2] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
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
    <form
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        marginTop: 30,
      }}
      onSubmit={onSubmit}
    >
      <BigInput
        autoFocus={true}
        placeholder="Password"
        type={showPassword ? 'text' : 'password'}
        value={password1}
        onChange={(e: ChangeEvent<HTMLInputElement>) =>
          setPassword1(e.target.value)
        }
        onEnter={onSubmit}
      />
      <BigInput
        placeholder="Confirm password"
        type={showPassword ? 'text' : 'password'}
        value={password2}
        onChange={(e: ChangeEvent<HTMLInputElement>) =>
          setPassword2(e.target.value)
        }
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
          <input type="checkbox" onChange={onShowPassword} /> Show password
        </label>
        <View style={{ flex: 1 }} />
        {buttons}
        <ButtonWithLoading type="primary" loading={loading}>
          OK
        </ButtonWithLoading>
      </View>
    </form>
  );
}

export function ConfirmOldPasswordForm({ buttons, onSetPassword }) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
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
    <form
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        marginTop: 30,
      }}
      onSubmit={onSubmit}
    >
      <BigInput
        autoFocus={true}
        placeholder="Password"
        type={showPassword ? 'text' : 'password'}
        value={password}
        onChange={(e: ChangeEvent<HTMLInputElement>) =>
          setPassword(e.target.value)
        }
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
          <input type="checkbox" onChange={onShowPassword} /> Show password
        </label>
        <View style={{ flex: 1 }} />
        {buttons}
        <ButtonWithLoading type="primary" loading={loading}>
          OK
        </ButtonWithLoading>
      </View>
    </form>
  );
}
