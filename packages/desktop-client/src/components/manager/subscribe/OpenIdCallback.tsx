import { useEffect, useState } from 'react';
import { Trans } from 'react-i18next';
import { Link } from 'react-router';

import { send } from '@actual-app/core/platform/client/connection';

import { useDispatch } from '#redux';
import { loggedIn } from '#users/usersSlice';

export function OpenIdCallback() {
  const dispatch = useDispatch();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');
    if (!code || !state || params.has('token')) {
      setFailed(true);
      return;
    }

    const completion = { code, state };
    async function initialize() {
      try {
        const result = await send('subscribe-complete-openid', completion);
        if (cancelled) {
          return;
        }
        if (result.error) {
          setFailed(true);
          return;
        }
        await dispatch(loggedIn());
      } catch {
        // The backend connection may not yet be available after a fresh start.
      }
      if (!cancelled) {
        timer = setTimeout(() => void initialize(), 1000);
      }
    }
    void initialize();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [dispatch]);

  return failed ? (
    <p>
      <Trans>
        Unable to complete this login. Start a new login from this device.
      </Trans>{' '}
      <Link to="/login">
        <Trans>Log in</Trans>
      </Link>
    </p>
  ) : null;
}
