import React, { useState, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { useHistory } from 'react-router-dom';
import * as actions from '@actual-app/loot-core/src/client/actions';
import {
  View,
  Text,
  Button,
  ButtonWithLoading
} from '@actual-app/loot-design/src/components/common';
import { colors, styles } from '@actual-app/loot-design/src/style';
import { loggedIn } from '@actual-app/loot-core/src/client/actions/user';
import { createBudget } from '@actual-app/loot-core/src/client/actions/budgets';
import { send } from '@actual-app/loot-core/src/platform/client/fetch';
import { useBootstrapped, Title, Input, Link, ExternalLink } from './common';

export default function Login() {
  let dispatch = useDispatch();
  let history = useHistory();
  let [password, setPassword] = useState('');
  let [loading, setLoading] = useState(false);
  let [error, setError] = useState(null);

  let { checked } = useBootstrapped();

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
    let { error } = await send('subscribe-sign-in', { password });
    setLoading(false);

    if (error) {
      setError(error);
    } else {
      dispatch(loggedIn());
    }
  }

  async function onDemo() {
    await dispatch(createBudget({ demoMode: true }));
  }

  if (!checked) {
    return null;
  }

  return (
    <>
      <View style={{ width: 450, marginTop: -30 }}>
        <Title text="Sign in to this Actual instance" />
        <Text
          style={{
            fontSize: 16,
            color: colors.n2,
            lineHeight: 1.4
          }}
        >
          If you lost your password, you likely still have access to your server
          to manually reset it.
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
            onClick={onDemo}
          >
            Try Demo &rarr;
          </Button>
        </View>
      </View>
    </>
  );
}
