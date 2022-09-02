import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch } from 'react-redux';
import { useHistory } from 'react-router-dom';

import { createBudget } from 'loot-core/src/client/actions/budgets';
import { loggedIn } from 'loot-core/src/client/actions/user';
import { send } from 'loot-core/src/platform/client/fetch';
import { View, Text, Button } from 'loot-design/src/components/common';
import { colors } from 'loot-design/src/style';

import { useBootstrapped, Title } from './common';
import { ConfirmPasswordForm } from './ConfirmPasswordForm';

export default function Bootstrap() {
  const { t } = useTranslation();

  let dispatch = useDispatch();
  let history = useHistory();
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
        return "Whoops, an error occurred on our side! We'll try to get it fixed soon.";
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
    <>
      <View style={{ width: 450, marginTop: -30 }}>
        <Title text={t('bootstrap.title')} />
        <Text
          style={{
            fontSize: 16,
            color: colors.n2,
            lineHeight: 1.4
          }}
        >
          {t('bootstrap.setPassword')}
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

        <ConfirmPasswordForm
          buttons={
            <Button
              bare
              style={{ fontSize: 15, color: colors.b4, marginRight: 15 }}
              onClick={onDemo}
            >
              {t('bootstrap.tryDemo')}
            </Button>
          }
          onSetPassword={onSetPassword}
          onError={setError}
        />
      </View>
    </>
  );
}
