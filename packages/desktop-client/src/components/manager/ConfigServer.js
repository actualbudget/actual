import React, { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { useHistory } from 'react-router-dom';

import { createBudget } from 'loot-core/src/client/actions/budgets';
import { signOut, loggedIn } from 'loot-core/src/client/actions/user';
import { send } from 'loot-core/src/platform/client/fetch';
import {
  View,
  Text,
  Button,
  ButtonWithLoading
} from 'loot-design/src/components/common';
import { useSetThemeColor } from 'loot-design/src/components/hooks';
import { colors } from 'loot-design/src/style';
import {
  isDevelopmentEnvironment,
  isPreviewEnvironment
} from 'loot-design/src/util/environment';

import { useServerURL } from '../../hooks/useServerURL';

import { Title, Input } from './subscribe/common';

export default function ConfigServer() {
  useSetThemeColor(colors.p5);
  let dispatch = useDispatch();
  let history = useHistory();
  let [url, setUrl] = useState('');
  let currentUrl = useServerURL();
  useEffect(() => {
    setUrl(currentUrl);
  }, [currentUrl]);
  let [loading, setLoading] = useState(false);
  let [error, setError] = useState(null);

  function getErrorMessage(error) {
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
    let { error } = await send('set-server-url', { url });

    if (
      error === 'network-failure' &&
      !url.startsWith('http://') &&
      !url.startsWith('https://')
    ) {
      let { error } = await send('set-server-url', { url: 'https://' + url });
      if (error) {
        setUrl('https://' + url);
        setError(error);
      } else {
        await dispatch(signOut());
        history.push('/');
      }
      setLoading(false);
    } else if (error) {
      setLoading(false);
      setError(error);
    } else {
      setLoading(false);
      await dispatch(signOut());
      history.push('/');
    }
  }

  function onSameDomain() {
    setUrl(window.location.origin);
  }

  async function onSkip() {
    await send('set-server-url', { url: null });
    await dispatch(loggedIn());
    history.push('/');
  }

  async function onCreateTestFile() {
    await send('set-server-url', { url: null });
    await dispatch(createBudget({ testMode: true }));
    window.__history.push('/');
  }

  return (
    <>
      <View style={{ maxWidth: 500, marginTop: -30 }}>
        <Title text="Where's the server?" />

        <Text
          style={{
            fontSize: 16,
            color: colors.n2,
            lineHeight: 1.5
          }}
        >
          {currentUrl ? (
            <>
              Existing sessions will be logged out and you will log in to this
              server. We will validate that Actual is running at this URL.
            </>
          ) : (
            <>
              There is no server configured. After running the server, specify
              the URL here to use the app. You can always change this later. We
              will validate that Actual is running at this URL.
            </>
          )}
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
          onSubmit={e => {
            e.preventDefault();
            onSubmit();
          }}
        >
          <Input
            autoFocus={true}
            placeholder={'https://example.com'}
            value={url}
            onChange={e => setUrl(e.target.value)}
            style={{ flex: 1, marginRight: 10 }}
          />
          <ButtonWithLoading primary loading={loading} style={{ fontSize: 15 }}>
            OK
          </ButtonWithLoading>
          {currentUrl && (
            <Button
              bare
              type="button"
              style={{ fontSize: 15, marginLeft: 10 }}
              onClick={() => history.goBack()}
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
            marginTop: 15
          }}
        >
          {currentUrl ? (
            <Button bare style={{ color: colors.n4 }} onClick={onSkip}>
              Stop using a server
            </Button>
          ) : (
            <>
              <Button
                bare
                style={{
                  color: colors.n4,
                  margin: 5,
                  marginRight: 15
                }}
                onClick={onSameDomain}
              >
                Use {window.location.origin.replace(/https?:\/\//, '')}
              </Button>
              <Button
                bare
                style={{ color: colors.n4, margin: 5 }}
                onClick={onSkip}
              >
                Don't use a server
              </Button>

              {(isDevelopmentEnvironment() || isPreviewEnvironment()) && (
                <Button
                  primary
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
    </>
  );
}
