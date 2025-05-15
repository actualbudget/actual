import { useEffect } from 'react';

import { send } from 'loot-core/platform/client/fetch';

import { useDispatch } from '../../../redux';
import { loggedIn } from '../../../users/usersSlice';

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
