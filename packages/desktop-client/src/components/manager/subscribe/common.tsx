// @ts-strict-ignore
import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router';

import { theme } from '@actual-app/components/theme';

import { send } from 'loot-core/platform/client/fetch';
import { type Handlers } from 'loot-core/types/handlers';

import {
  useSetLoginMethods,
  useSetMultiuserEnabled,
  useSetServerURL,
} from '@desktop-client/components/ServerContext';
import { useNavigate } from '@desktop-client/hooks/useNavigate';

// There are two URLs that dance with each other: `/login` and
// `/bootstrap`. Both of these URLs check the state of the the server
// and make sure the user is looking at the right page. For example,
// it doesn't make sense to show the login page if the server doesn't
// have any accounts yet. It also doesn't make sense to show the
// bootstrap page if the server already has been set up with a
// password. Both pages will redirect to the other depending on state;
// they will also potentially redirect to other pages which do *not*
// do any checks.
export function useBootstrapped(redirect = true) {
  const [checked, setChecked] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const setServerURL = useSetServerURL();
  const setMultiuserEnabled = useSetMultiuserEnabled();
  const setLoginMethods = useSetLoginMethods();

  useEffect(() => {
    async function run() {
      const ensure = url => {
        if (location.pathname !== url) {
          if (redirect) {
            navigate(url);
          }
        } else {
          setChecked(true);
        }
      };

      const url = await send('get-server-url');
      const bootstrapped = await send('get-did-bootstrap');
      if (url == null && !bootstrapped) {
        // A server hasn't been specified yet
        const serverURL = window.location.origin;
        const result: Awaited<
          ReturnType<Handlers['subscribe-needs-bootstrap']>
        > = await send('subscribe-needs-bootstrap', {
          url: serverURL,
        });

        if ('error' in result || !result.hasServer) {
          console.log('error' in result && result.error);
          navigate('/config-server');
          return;
        }

        await setServerURL(serverURL, { validate: false });

        setMultiuserEnabled(result.multiuser);
        setLoginMethods(result.availableLoginMethods);

        if (result.bootstrapped) {
          ensure(`/login`);
        } else {
          ensure('/bootstrap');
        }
      } else {
        const result: Awaited<
          ReturnType<Handlers['subscribe-needs-bootstrap']>
        > = await send('subscribe-needs-bootstrap');

        if ('error' in result) {
          navigate('/error', { state: { error: result.error } });
        } else if (result.bootstrapped) {
          ensure(`/login`);

          if ('hasServer' in result && result.hasServer) {
            setMultiuserEnabled(result.multiuser);
            setLoginMethods(result.availableLoginMethods);
          }
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
