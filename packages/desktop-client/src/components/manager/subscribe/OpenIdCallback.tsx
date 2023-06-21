import { useEffect } from 'react';
import { useDispatch } from 'react-redux';

import { loggedIn } from 'loot-core/src/client/actions/user';
import { send } from 'loot-core/src/platform/client/fetch';

export default function OpenIdCallback() {
  let dispatch = useDispatch();
  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get('token');
    send('subscribe-set-token', { token }).then(() => {
      dispatch(loggedIn());
    });
  });
  return null;
}
