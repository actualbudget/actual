import { useEffect } from 'react';

import { loggedIn } from 'loot-core/client/users/usersSlice';
import { send } from 'loot-core/src/platform/client/fetch';

import { useDispatch } from '../../../redux';

export function OpenIdCallback() {
  const dispatch = useDispatch();
  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get('token');
    send('subscribe-set-token', { token: token as string }).then(() => {
      dispatch(loggedIn());
    });
  });
  return null;
}
