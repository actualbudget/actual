import React, { useState, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { useHistory } from 'react-router-dom';
import * as actions from 'loot-core/src/client/actions';
import {
  View,
  Text,
  Button,
  ButtonWithLoading
} from 'loot-design/src/components/common';
import { colors, styles } from 'loot-design/src/style';
import { loggedIn } from 'loot-core/src/client/actions/user';
import { createBudget } from 'loot-core/src/client/actions/budgets';
import { send } from 'loot-core/src/platform/client/fetch';
import { Title, Input, Link, ExternalLink } from './common';

export default function Login() {
  let dispatch = useDispatch();
  let history = useHistory();
  let [password, setPassword] = useState('');
  let [username, setUsername] = useState('');
  let [loading, setLoading] = useState(false);
  let [error, setError] = useState(null);

  function getErrorMessage(error) {
    switch (error) {
      case 'invalid-password':
        return 'Invalid password';
      case 'network-failure':
        return 'Unable to contact the server';
      default:
        return "Whoops, an error occurred on our side! We'll try to get it fixed soon.";
    }
  }

  async function onSubmit(e) {
    e.preventDefault();
    if (password === '' || loading) {
      return;
    }

    setError(null);
    setLoading(true);
    let { error } = await send('subscribe-sign-in', { username, password });
    setLoading(false);

    if (error) {
      setError(error);
    } else {
      dispatch(loggedIn());
    }
  }

  async function onRegister() {
    history.push('/register');
  }

  return (
    <>
      <View style={{ width: 450, marginTop: -30 }}>
        <Title text="Sign in" />
        <Text
          style={{
            fontSize: 16,
            color: colors.n2,
            lineHeight: 1.4
          }}
        >

        </Text>

        {error && (
          <Text
            style={{
              marginTop: 20,
              color: colors.r4,
              borderRadius: 4,
              fontSize: 15
            }}
          >
            {getErrorMessage(error)}
          </Text>
        )}

        <form
          style={{ display: 'flex', flexDirection: 'row', marginTop: 30 }}
          onSubmit={onSubmit}
        >
          <Input
            autoFocus={true}
            placeholder="Username"
            type="text"
            onChange={e => setUsername(e.target.value)}
            style={{ flex: 1, marginRight: 10 }}
          />
          <Input
            placeholder="Password"
            type="password"
            onChange={e => setPassword(e.target.value)}
            style={{ flex: 1, marginRight: 10 }}
          />
          <ButtonWithLoading primary loading={loading} style={{ fontSize: 15 }}>
            Sign in
          </ButtonWithLoading>
        </form>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'center',
            marginTop: 15
          }}
        >
          <Button
            bare
            style={{ fontSize: 15, color: colors.b4, marginLeft: 10 }}
            onClick={onRegister}
          >
            Register instead &rarr;
          </Button>
        </View>
      </View>
    </>
  );
}
