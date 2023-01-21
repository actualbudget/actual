import React from 'react';

import { css } from 'glamor';

import { colors } from '../style';

import { View, Text } from './common';

export function SectionLabel({ title, style }) {
  return (
    <View
      style={[
        {
          fontWeight: 500,
          textTransform: 'uppercase',
          color: colors.b3,
          marginBottom: 5,
          lineHeight: '1em'
        },
        style
      ]}
    >
      {title}
    </View>
  );
}

export function FormLabel({ style, title }) {
  return (
    <Text style={[{ fontSize: 13, marginBottom: 3, color: colors.n3 }, style]}>
      {title}
    </Text>
  );
}

export function FormField({ style, children }) {
  return <View style={style}>{children}</View>;
}

// Custom inputs

export function Checkbox(props) {
  return (
    <input
      type="checkbox"
      {...props}
      {...css(
        [
          {
            position: 'relative',
            margin: 0,
            marginRight: 6,
            width: 15,
            height: 15,
            appearance: 'none',
            outline: 0,
            border: '1px solid #d0d0d0',
            borderRadius: 4,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            backgroundColor: 'white',
            ':checked': {
              border: '1px solid ' + colors.b6,
              backgroundColor: colors.b6,
              '::after': {
                display: 'block',
                background:
                  colors.b6 +
                  ' url(\'data:image/svg+xml; utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path fill="white" d="M0 11l2-2 5 5L18 3l2 2L7 18z"/></svg>\') 9px 9px',
                width: 9,
                height: 9,
                content: ' '
              }
            },
            '&.focus-visible:focus': {
              '::before': {
                position: 'absolute',
                top: -5,
                bottom: -5,
                left: -5,
                right: -5,
                border: '2px solid ' + colors.b5,
                borderRadius: 6,
                content: ' '
              }
            }
          }
        ],
        props.style
      )}
    />
  );
}
