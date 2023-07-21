import React, { type ReactNode, type HTMLProps } from 'react';

import { css, type CSSProperties } from 'glamor';

import { theme } from '../style';

import { View, Text } from './common';

type SectionLabelProps = {
  title?: string;
  style?: CSSProperties;
};

export const SectionLabel = ({ title, style }: SectionLabelProps) => {
  return (
    <View
      style={[
        {
          fontWeight: 500,
          textTransform: 'uppercase',
          color: theme.formLabelText,
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

type FormLabelProps = {
  title: string;
  id?: string;
  htmlFor?: string;
  style?: CSSProperties;
};

export const FormLabel = ({ style, title, id, htmlFor }: FormLabelProps) => {
  return (
    <Text
      style={[
        { fontSize: 13, marginBottom: 3, color: theme.formLabelText },
        style,
      ]}
    >
      <label htmlFor={htmlFor} id={id}>
        {title}
      </label>
    </Text>
  );
};

type FormFieldProps = {
  style?: CSSProperties;
  children: ReactNode;
};

export const FormField = ({ style, children }: FormFieldProps) => {
  return <View style={style}>{children}</View>;
};

// Custom inputs

type CheckboxProps = Omit<HTMLProps<HTMLInputElement>, 'type' | 'styles'> & {
  styles?: CSSProperties;
};

export const Checkbox = (props: CheckboxProps) => {
  return (
    <input
      type="checkbox"
      {...props}
      {...css(
        {
          position: 'relative',
          margin: 0,
          marginRight: 6,
          accentColor: theme.formInputBackgroundSelected,
        },

        props.styles,
      )}
    />
  );
};
