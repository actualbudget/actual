// @ts-strict-ignore
import React, { useState } from 'react';

import { ButtonWithLoading } from '../../common/Button2';
import { BigInput } from '../../common/Input';
import { View } from '../../common/View';

export function ConfirmPasswordForm({ buttons, onSetPassword, onError }) {
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
        autoFocus={true}
        placeholder="Password"
        type={showPassword ? 'text' : 'password'}
        value={password1}
        onChangeValue={setPassword1}
        onEnter={onSubmit}
      />
      <BigInput
        placeholder="Confirm password"
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
          <input type="checkbox" onChange={onShowPassword} /> Show password
        </label>
        <View style={{ flex: 1 }} />
        {buttons}
        <ButtonWithLoading
          variant="primary"
          aria-label="OK"
          isLoading={loading}
          onPress={onSubmit}
        >
          OK
        </ButtonWithLoading>
      </View>
    </View>
  );
}
