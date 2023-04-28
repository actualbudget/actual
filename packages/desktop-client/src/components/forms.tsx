import React from 'react';

import { css } from 'glamor';
import type { CSSProperties } from 'glamor';

import { colors } from '../style';

import { View, Text } from './common';

interface SectionLabelProps {
  title?: string;
  style?: CSSProperties;
}

export const SectionLabel: React.FC<SectionLabelProps> = ({ title, style }) => {
  return (
    <View
      style={[
        {
          fontWeight: 500,
          textTransform: 'uppercase',
          color: colors.b3,
          marginBottom: 5,
          lineHeight: '1em',
        },
        style,
      ]}
    >
      {title}
    </View>
  );
};

interface FormLabelProps {
  title: string;
  id?: string;
  htmlFor?: string;
  style?: CSSProperties;
}

export const FormLabel: React.FC<FormLabelProps> = ({
  style,
  title,
  id,
  htmlFor,
}) => {
  return (
    <Text style={[{ fontSize: 13, marginBottom: 3, color: colors.n3 }, style]}>
      <label htmlFor={htmlFor} id={id}>
        {title}
      </label>
    </Text>
  );
};

interface FormFieldProps {
  style?: CSSProperties;
  children: React.ReactNode;
}

export const FormField: React.FC<FormFieldProps> = ({ style, children }) => {
  return <View style={style}>{children}</View>;
};

// Custom inputs

type CheckboxProps = Omit<
  React.HTMLProps<HTMLInputElement>,
  'type' | 'styles'
> & { styles?: CSSProperties };

export const Checkbox: React.FC<CheckboxProps> = props => {
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
                  // eslint-disable-next-line rulesdir/typography
                  ' url(\'data:image/svg+xml; utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path fill="white" d="M0 11l2-2 5 5L18 3l2 2L7 18z"/></svg>\') 9px 9px',
                width: 9,
                height: 9,
                content: ' ',
              },
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
                content: ' ',
              },
            },
          },
        ],
        props.style,
      )}
    />
  );
};
