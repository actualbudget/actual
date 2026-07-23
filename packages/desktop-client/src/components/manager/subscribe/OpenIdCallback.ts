import { useEffect } from 'react';

import { send } from '@actual-app/core/platform/client/connection';

import { useDispatch } from '#redux';
import { loggedIn } from '#users/usersSlice';

export function OpenIdCallback() {
  const dispatch = useDispatch();
  // Intentionally NO dependency array: the effect re-runs on every render so
  // the token write + login is retried until it succeeds and the manager
  // navigates away from /openid-cb. On a fresh session the first attempt can
  // fire before the token is stored or the backend connection is ready (its
  // file-list fetch then 401s and `files` never loads); the re-runs are what
  // recover it. Forcing this to run once regresses login on Electron and on a
  // fresh web session, so don't add a dependency array here.
  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get('token');
    if (!token) {
      return;
    }
    void send('subscribe-set-token', { token }).then(() => {
      void dispatch(loggedIn());
    });
  });
  return null;
}
