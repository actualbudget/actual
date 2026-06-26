import { useEffect } from 'react';

import { send } from '@actual-app/core/platform/client/connection';

import { useDispatch } from '#redux';
import { loggedIn } from '#users/usersSlice';

export function OpenIdCallback() {
  const dispatch = useDispatch();
  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get('token');
    void send('subscribe-set-token', { token: token as string }).then(() => {
      void dispatch(loggedIn());
    });
  });
  return null;
}
