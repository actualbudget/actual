import React, { useState } from 'react';
import { useDispatch } from 'react-redux';

import { createBudget } from 'loot-core/src/client/actions/budgets';
import { loggedIn } from 'loot-core/src/client/actions/user';
import { send } from 'loot-core/src/platform/client/fetch';

import { colors } from '../../../style';
import { View, Text, Button, P, ExternalLink } from '../../common';

import { useBootstrapped, Title } from './common';
import { ConfirmPasswordForm } from './ConfirmPasswordForm';

export default function Bootstrap() {
  let dispatch = useDispatch();
  let [error, setError] = useState(null);

  let { checked } = useBootstrapped();

  function getErrorMessage(error) {
    switch (error) {
      case 'invalid-password':
        return 'Password cannot be empty';
      case 'password-match':
        return 'Passwords do not match';
      case 'network-failure':
        return 'Unable to contact the server';
      default:
        return `An unknown error occurred: ${error}`;
    }
  }

  async function onSetPassword(password) {
    setError(null);
    let { error } = await send('subscribe-bootstrap', { password });

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
    <View style={{ maxWidth: 450, marginTop: -30 }}>
      <Title text="Welcome to Actual!" />
      <P style={{ fontSize: 16, color: colors.n2 }}>
        Actual is a super fast privacy-focused app for managing your finances.
        To secure your data, you’ll need to set a password for your server.
      </P>

      <P isLast style={{ fontSize: 16, color: colors.n2 }}>
        Consider opening{' '}
        <ExternalLink to="https://actualbudget.org/docs/tour/">
          our tour
        </ExternalLink>{' '}
        in a new tab for some guidance on what to do when you’ve set your
        password.
      </P>

      {error && (
        <Text
          style={{
            marginTop: 20,
            color: colors.r4,
            borderRadius: 4,
            fontSize: 15,
          }}
        >
          {getErrorMessage(error)}
        </Text>
      )}

      <ConfirmPasswordForm
        buttons={
          <Button
            bare
            style={{ fontSize: 15, color: colors.b4, marginRight: 15 }}
            onClick={onDemo}
          >
            Try Demo
          </Button>
        }
        onSetPassword={onSetPassword}
        onError={setError}
      />
    </View>
  );
}
