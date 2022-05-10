import React, { useState } from 'react';
import {
  View,
  ButtonWithLoading
} from 'loot-design/src/components/common';
import { Input } from './common';

export function RegisterForm({ buttons, onRegister, onError }) {
  let [username, setUsername] = useState('');
  let [email, setEmail] = useState('');
  let [password1, setPassword1] = useState('');
  let [password2, setPassword2] = useState('');
  let [showPassword, setShowPassword] = useState(false);
  let [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    if (loading) {
      return;
    }

    if (password1 === password2) {
      setLoading(true);
      await onRegister(username, password1, email);
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
        marginTop: 30
      }}
      onSubmit={onSubmit}
    >
      <Input
        autoFocus={true}
        placeholder="Username"
        type="text"
        value={username}
        onChange={e => setUsername(e.target.value)}
      />
      <Input
        autoFocus={true}
        placeholder="Email Address (optional)"
        type="text"
        value={email}
        onChange={e => setEmail(e.target.value)}
        style={{ marginTop: 10 }}
      />
      <Input
        placeholder="Password"
        type={showPassword ? 'text' : 'password'}
        value={password1}
        onChange={e => setPassword1(e.target.value)}
        style={{ marginTop: 20 }}
      />
      <Input
        placeholder="Confirm password"
        type={showPassword ? 'text' : 'password'}
        value={password2}
        onChange={e => setPassword2(e.target.value)}
        style={{ marginTop: 10 }}
      />

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          fontSize: 15,
          marginTop: 20
        }}
      >
        <label style={{ userSelect: 'none' }}>
          <input type="checkbox" onChange={onShowPassword} /> Show password
        </label>
        <View style={{ flex: 1 }} />
        {buttons}
        <ButtonWithLoading
          primary
          loading={loading}
        >
          OK
        </ButtonWithLoading>
      </View>
    </form>
  );
}
