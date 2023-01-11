import React, { useEffect, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';

import { send } from 'loot-core/src/platform/client/fetch';
import {
  Text,
  Button,
  Input as BaseInput
} from 'loot-design/src/components/common';
import { colors, styles } from 'loot-design/src/style';

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
  let history = useHistory();
  let location = useLocation();

  useEffect(() => {
    async function run() {
      let ensure = url => {
        if (location.pathname !== url) {
          history.push(url);
        } else {
          setChecked(true);
        }
      };

      let url = await send('get-server-url');
      if (url == null) {
        // A server hasn't been specified yet
        history.push('/config-server');
      } else {
        let { error, bootstrapped } = await send('subscribe-needs-bootstrap');
        if (error) {
          history.push('/error', { error });
        } else if (bootstrapped) {
          ensure('/login');
        } else {
          ensure('/bootstrap');
        }
      }
    }
    run();
  }, [history, location]);

  return { checked };
}

export function getEmail(location) {
  let m = location.search.match(/email=([^&]*)/);
  if (!m) {
    return '';
  }
  return decodeURIComponent(m[1]);
}

export function Title({ text }) {
  return (
    <Text
      style={{
        fontSize: 40,
        fontWeight: 700,
        color: colors.p3,
        marginBottom: 20
      }}
    >
      {text}
    </Text>
  );
}

export const Input = React.forwardRef((props, ref) => {
  return (
    <BaseInput
      {...props}
      style={[
        {
          padding: 10,
          fontSize: 15,
          border: 'none',
          ...styles.shadow,
          ':focus': { border: 'none', ...styles.shadow }
        },
        props.style
      ]}
    />
  );
});

export const BareButton = React.forwardRef((props, ref) => {
  return (
    <Button
      ref={ref}
      bare
      {...props}
      style={[
        {
          color: colors.p4,
          fontSize: 15,
          textDecoration: 'none',
          padding: '5px 7px',
          borderRadius: 4,
          ':hover': {
            backgroundColor: colors.n9
          },
          ':active': {
            backgroundColor: colors.n9
          }
        },
        props.style
      ]}
    />
  );
});

export const ExternalLink = React.forwardRef((props, ref) => {
  let { href, ...linkProps } = props;
  return (
    <BareButton
      to="/"
      {...linkProps}
      onClick={e => {
        e.preventDefault();
        window.Actual.openURLInBrowser(href);
      }}
    />
  );
});

export const BackLink = React.forwardRef((props, ref) => {
  return (
    <BareButton
      ref={ref}
      to="/"
      onClick={e => {
        e.preventDefault();
        props.history.goBack();
      }}
    >
      Back
    </BareButton>
  );
});

export function Paragraph({ style, children }) {
  return (
    <Text
      style={[
        {
          fontSize: 15,
          color: colors.n2,
          lineHeight: 1.5,
          marginTop: 20
        },
        style
      ]}
    >
      {children}
    </Text>
  );
}
