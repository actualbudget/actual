import React, {
  type ComponentProps,
  forwardRef,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { useHistory, useLocation } from 'react-router-dom';

import { type CSSProperties } from 'glamor';

import { send } from 'loot-core/src/platform/client/fetch';

import { colors, styles } from '../../../style';
import { Text, Button, Input as BaseInput } from '../../common';
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
  let history = useHistory();
  let location = useLocation();
  let setServerURL = useSetServerURL();

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
        let serverURL = window.location.origin;
        let result = await send('subscribe-needs-bootstrap', {
          url: serverURL,
        });
        if ('error' in result || !result.hasServer) {
          console.log('error' in result && result.error);
          history.push('/config-server');
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
          history.push('/error', { error: result.error });
        } else if (result.bootstrapped) {
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

type TitleProps = {
  text: string;
};
export function Title({ text }: TitleProps) {
  return (
    <h1
      style={{
        fontSize: 40,
        fontWeight: 700,
        color: colors.p3,
        marginBottom: 20,
      }}
    >
      {text}
    </h1>
  );
}

type InputProps = ComponentProps<typeof BaseInput>;
export const Input = forwardRef<HTMLInputElement, InputProps>((props, ref) => {
  return (
    <BaseInput
      {...props}
      style={[
        {
          padding: 10,
          fontSize: 15,
          border: 'none',
          ...styles.shadow,
          ':focus': { border: 'none', ...styles.shadow },
        },
        props.style,
      ]}
    />
  );
});

type BareButtonProps = ComponentProps<typeof Button>;
export const BareButton = forwardRef<HTMLButtonElement, BareButtonProps>(
  (props, ref) => {
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
              backgroundColor: colors.n9,
            },
            ':active': {
              backgroundColor: colors.n9,
            },
          },
          props.style,
        ]}
      />
    );
  },
);

type ExternalLinkProps = ComponentProps<typeof BareButton>;
export const ExternalLink = forwardRef<HTMLButtonElement, ExternalLinkProps>(
  (props, ref) => {
    let { href, ...linkProps } = props;
    return (
      <BareButton
        // @ts-expect-error prop does not exist on Button
        to="/"
        {...linkProps}
        onClick={e => {
          e.preventDefault();
          window.Actual.openURLInBrowser(href);
        }}
      />
    );
  },
);

type BackLinkProps = ComponentProps<typeof BareButton> & {
  history;
};
export const BackLink = forwardRef<HTMLButtonElement, BackLinkProps>(
  (props, ref) => {
    return (
      <BareButton
        ref={ref}
        // @ts-expect-error prop does not exist on Button
        to="/"
        onClick={e => {
          e.preventDefault();
          props.history.goBack();
        }}
      >
        Back
      </BareButton>
    );
  },
);

type ParagraphProps = {
  style?: CSSProperties;
  children: ReactNode;
};
export function Paragraph({ style, children }: ParagraphProps) {
  return (
    <Text
      style={[
        {
          fontSize: 15,
          color: colors.n2,
          lineHeight: 1.5,
          marginTop: 20,
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}
