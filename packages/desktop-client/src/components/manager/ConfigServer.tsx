// @ts-strict-ignore
import React, { useState, useEffect } from 'react';

import {
  isNonProductionEnvironment,
  isElectron,
} from 'loot-core/src/shared/environment';

import { useActions } from '../../hooks/useActions';
import { useNavigate } from '../../hooks/useNavigate';
import { useSetThemeColor } from '../../hooks/useSetThemeColor';
import { theme } from '../../style';
import { Button, ButtonWithLoading } from '../common/Button';
import { BigInput } from '../common/Input';
import { Text } from '../common/Text';
import { View } from '../common/View';
import { useServerURL, useSetServerURL } from '../ServerContext';

import { Title } from './subscribe/common';

export function ConfigServer() {
  useSetThemeColor(theme.mobileConfigServerViewTheme);
  const { createBudget, signOut, loggedIn } = useActions();
  const navigate = useNavigate();
  const [url, setUrl] = useState('');
  const currentUrl = useServerURL();
  const setServerUrl = useSetServerURL();
  useEffect(() => {
    setUrl(currentUrl);
  }, [currentUrl]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function getErrorMessage(error: string) {
    switch (error) {
      case 'network-failure':
        return 'Server is not running at this URL. Make sure you have HTTPS set up properly.';
      default:
        return 'Server does not look like an Actual server. Is it set up correctly?';
    }
  }

  async function onSubmit() {
    if (url === '' || loading) {
      return;
    }

    setError(null);
    setLoading(true);
    const { error } = await setServerUrl(url);

    if (
      ['network-failure', 'get-server-failure'].includes(error) &&
      !url.startsWith('http://') &&
      !url.startsWith('https://')
    ) {
      const { error } = await setServerUrl('https://' + url);
      if (error) {
        setUrl('https://' + url);
        setError(error);
      } else {
        await signOut();
        navigate('/');
      }
      setLoading(false);
    } else if (error) {
      setLoading(false);
      setError(error);
    } else {
      setLoading(false);
      await signOut();
      navigate('/');
    }
  }

  function onSameDomain() {
    setUrl(window.location.origin);
  }

  async function onSkip() {
    await setServerUrl(null);
    await loggedIn();
    navigate('/');
  }

  async function onCreateTestFile() {
    await setServerUrl(null);
    await createBudget({ testMode: true });
    window.__navigate('/');
  }

  return (
    <View style={{ maxWidth: 500, marginTop: -30 }}>
      <Title text="Where’s the server?" />

      <Text
        style={{
          fontSize: 16,
          color: theme.tableRowHeaderText,
          lineHeight: 1.5,
        }}
      >
        {currentUrl ? (
          <>
            Existing sessions will be logged out and you will log in to this
            server. We will validate that Actual is running at this URL.
          </>
        ) : (
          <>
            There is no server configured. After running the server, specify the
            URL here to use the app. You can always change this later. We will
            validate that Actual is running at this URL.
          </>
        )}
      </Text>

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

      <form
        style={{ display: 'flex', flexDirection: 'row', marginTop: 30 }}
        onSubmit={e => {
          e.preventDefault();
          onSubmit();
        }}
      >
        <BigInput
          autoFocus={true}
          placeholder="https://example.com"
          value={url || ''}
          onChangeValue={setUrl}
          style={{ flex: 1, marginRight: 10 }}
        />
        <ButtonWithLoading
          type="primary"
          loading={loading}
          style={{ fontSize: 15 }}
        >
          OK
        </ButtonWithLoading>
        {currentUrl && (
          <Button
            type="bare"
            style={{ fontSize: 15, marginLeft: 10 }}
            onClick={() => navigate(-1)}
          >
            Cancel
          </Button>
        )}
      </form>

      <View
        style={{
          flexDirection: 'row',
          flexFlow: 'row wrap',
          justifyContent: 'center',
          marginTop: 15,
        }}
      >
        {currentUrl ? (
          <Button
            type="bare"
            style={{ color: theme.pageTextLight }}
            onClick={onSkip}
          >
            Stop using a server
          </Button>
        ) : (
          <>
            {!isElectron() && (
              <Button
                type="bare"
                style={{
                  color: theme.pageTextLight,
                  margin: 5,
                  marginRight: 15,
                }}
                onClick={onSameDomain}
              >
                Use current domain
              </Button>
            )}
            <Button
              type="bare"
              style={{ color: theme.pageTextLight, margin: 5 }}
              onClick={onSkip}
            >
              Don’t use a server
            </Button>

            {isNonProductionEnvironment() && (
              <Button
                type="primary"
                style={{ marginLeft: 15 }}
                onClick={onCreateTestFile}
              >
                Create test file
              </Button>
            )}
          </>
        )}
      </View>
    </View>
  );
}
