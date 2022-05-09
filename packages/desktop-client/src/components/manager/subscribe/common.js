import React, { useEffect, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import {
  AnchorLink,
  Text,
  Button,
  ButtonLink,
  Input as BaseInput
} from 'loot-design/src/components/common';
import { colors, styles } from 'loot-design/src/style';
import { send } from 'loot-core/src/platform/client/fetch';

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
          boxShadow: styles.shadow,
          ':focus': { border: 'none', boxShadow: styles.shadow }
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
