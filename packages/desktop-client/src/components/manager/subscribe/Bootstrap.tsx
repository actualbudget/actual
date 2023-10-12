import React, { useState } from 'react';
import { useDispatch } from 'react-redux';

import { createBudget } from 'loot-core/src/client/actions/budgets';
import { loggedIn } from 'loot-core/src/client/actions/user';
import { send } from 'loot-core/src/platform/client/fetch';

import { theme } from '../../../style';
import Button from '../../common/Button';
import ExternalLink from '../../common/ExternalLink';
import Paragraph from '../../common/Paragraph';
import Text from '../../common/Text';
import View from '../../common/View';

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
      <Paragraph style={{ fontSize: 16, color: theme.pageTextDark }}>
        Actual is a super fast privacy-focused app for managing your finances.
        To secure your data, you’ll need to set a password for your server.
      </Paragraph>

      <Paragraph isLast style={{ fontSize: 16, color: theme.pageTextDark }}>
        Consider opening{' '}
        <ExternalLink to="https://actualbudget.org/docs/tour/">
          our tour
        </ExternalLink>{' '}
        in a new tab for some guidance on what to do when you’ve set your
        password.
      </Paragraph>

      {error && (
        <Text
          style={{
            marginTop: 20,
            color: theme.errorText,
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
            type="bare"
            style={{ fontSize: 15, color: theme.pageTextLink, marginRight: 15 }}
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
