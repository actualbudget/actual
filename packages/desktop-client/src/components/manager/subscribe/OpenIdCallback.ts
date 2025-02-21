import { useEffect } from 'react';

import { loggedIn } from 'loot-core/client/actions/user';
import { send } from 'loot-core/platform/client/fetch';

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
