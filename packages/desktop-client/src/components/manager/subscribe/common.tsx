import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

import { send } from 'loot-core/src/platform/client/fetch';

import { theme } from '../../../style';
import { useSetServerURL } from '../../ServerContext';

// There are two URLs that dance with each other: `/login` and
// `/bootstrap`. Both of these URLs check the state of the the server
// and make sure the user is looking at the right page. For example,
// it doesn't make sense to show the login page if the server doesn't
// have any accounts yet. It also doesn't make sense to show the
// bootstrap page if the server already has been setup with a
// password. Both pages will redirect to the other depending on state;
// they will also potentially redirect to other pages which do *not*
// do any checks.
export function useBootstrapped() {
  let [checked, setChecked] = useState(false);
  let navigate = useNavigate();
  let location = useLocation();
  let setServerURL = useSetServerURL();

  useEffect(() => {
    async function run() {
      let ensure = url => {
        if (location.pathname !== url) {
          navigate(url);
        } else {
          setChecked(true);
        }
      };

      let url = await send('get-server-url');
      let bootstrapped = await send('get-did-bootstrap');
      if (url == null && !bootstrapped) {
        // A server hasn't been specified yet
        let serverURL = window.location.origin;
        let result = await send('subscribe-needs-bootstrap', {
          url: serverURL,
        });
        if ('error' in result || !result.hasServer) {
          console.log('error' in result && result.error);
          navigate('/config-server');
          return;
        }

        await setServerURL(serverURL, { validate: false });

        if (result.bootstrapped) {
          ensure('/login');
        } else {
          ensure('/bootstrap');
        }
      } else {
        let result = await send('subscribe-needs-bootstrap');
        if ('error' in result) {
          navigate('/error', { state: { error: result.error } });
        } else if (result.bootstrapped) {
          ensure('/login');
        } else {
          ensure('/bootstrap');
        }
      }
    }
    run();
  }, [location]);

  return { checked };
}

type TitleProps = {
  text: string;
};
export function Title({ text }: TitleProps) {
  return (
    <h1
      style={{
        fontSize: 40,
        fontWeight: 700,
        color: theme.pageTextPositive,
        marginBottom: 20,
      }}
    >
      {text}
    </h1>
  );
}
