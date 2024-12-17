import { useEffect } from 'react';

import { loggedIn } from 'loot-core/src/client/actions/user';
import { send } from 'loot-core/src/platform/client/fetch';

import { useAppDispatch } from '../../../redux';

export function OpenIdCallback() {
  const dispatch = useAppDispatch();
  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get('token');
    send('subscribe-set-token', { token: token as string }).then(() => {
      dispatch(loggedIn());
    });
  });
  return null;
}
