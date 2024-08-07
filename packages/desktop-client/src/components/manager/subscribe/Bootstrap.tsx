// @ts-strict-ignore
import React, { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useDispatch } from 'react-redux';

import { createBudget } from 'loot-core/src/client/actions/budgets';
import { loggedIn } from 'loot-core/src/client/actions/user';
import { send } from 'loot-core/src/platform/client/fetch';

import { theme } from '../../../style';
import { Button } from '../../common/Button2';
import { Link } from '../../common/Link';
import { Paragraph } from '../../common/Paragraph';
import { Text } from '../../common/Text';
import { View } from '../../common/View';

import { useBootstrapped, Title } from './common';
import { ConfirmPasswordForm } from './ConfirmPasswordForm';

export function Bootstrap() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const [error, setError] = useState(null);

  const { checked } = useBootstrapped();

  function getErrorMessage(error) {
    switch (error) {
      case 'invalid-password':
        return t('Password cannot be empty');
      case 'password-match':
        return t('Passwords do not match');
      case 'network-failure':
        return t('Unable to contact the server');
      default:
        return t(`An unknown error occurred: {{error}}`, { error });
    }
  }

  async function onSetPassword(password) {
    setError(null);
    const { error } = await send('subscribe-bootstrap', { password });

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
      <Title text={t('Welcome to Actual!')} />
      <Paragraph style={{ fontSize: 16, color: theme.pageTextDark }}>
        <Trans>
          Actual is a super fast privacy-focused app for managing your finances.
          To secure your data, you’ll need to set a password for your server.
        </Trans>
      </Paragraph>

      <Paragraph isLast style={{ fontSize: 16, color: theme.pageTextDark }}>
        <Trans>
          Consider opening{' '}
          <Link variant="external" to="https://actualbudget.org/docs/tour/">
            our tour
          </Link>{' '}
          in a new tab for some guidance on what to do when you’ve set your
          password.
        </Trans>
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
            variant="bare"
            style={{ fontSize: 15, color: theme.pageTextLink, marginRight: 15 }}
            onPress={onDemo}
          >
            {t('Try Demo')}
          </Button>
        }
        onSetPassword={onSetPassword}
        onError={setError}
      />
    </View>
  );
}
