import React, { useState, useEffect, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { useHistory } from 'react-router-dom';
import { View, Text, Button, Tooltip } from 'loot-design/src/components/common';
import { colors, styles } from 'loot-design/src/style';
import { loggedIn } from 'loot-core/src/client/actions/user';
import { send } from 'loot-core/src/platform/client/fetch';
import { RegisterForm } from './RegisterForm';
import { Title, Input, Link, ExternalLink } from './common';

export default function Register() {
  let dispatch = useDispatch();
  let history = useHistory();
  let [error, setError] = useState(null);

  function getErrorMessage(error) {
    switch (error) {
      case 'invalid-password':
        return 'Password cannot be empty';
      case 'invalid-username':
        return 'Username is already given';
      case 'password-match':
        return 'Passwords do not match';
      case 'network-failure':
        return 'Unable to contact the server';
      default:
        return "Whoops, an error occurred on our side! We'll try to get it fixed soon.";
    }
  }

  async function onRegister(username, password, email) {
    setError(null);
    let { error } = await send('subscribe-bootstrap', { username, password, email });

    if (error) {
      setError(error);
    } else {
      dispatch(loggedIn());
    }
  }

  async function onLogin() {
    history.push('/login');
  }

  return (
    <>
      <View style={{ width: 450, marginTop: -30 }}>
        <Title text="Register" />
        <Text
          style={{
            fontSize: 16,
            color: colors.n2,
            lineHeight: 1.4
          }}
        >
          Thanks for your interest in actualcollective! We work hard to provide you with a <b>free</b> hosted alternative.
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

        <RegisterForm
          onRegister={onRegister}
          onError={setError}
        />
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
            onClick={onLogin}
          >
            Login instead &rarr;
          </Button>
        </View>
      </View>
    </>
  );
}
