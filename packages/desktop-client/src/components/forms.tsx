import React, { type ReactNode, type HTMLProps } from 'react';

import { css, type CSSProperties } from 'glamor';

import { colorsm } from '../style';

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
          color: colorsm.tableText,
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
        { fontSize: 13, marginBottom: 3, color: colorsm.formLabelText },
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
        [
          {
            position: 'relative',
            margin: 0,
            marginRight: 6,
            width: 15,
            height: 15,
            appearance: 'none',
            outline: 0,
            border: '1px solid ' + colorsm.formInputBorder,
            borderRadius: 4,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'none',
            backgroundColor: 'none',
            ':checked': {
              border: '1px solid ' + colorsm.formInputBorderSelected,
              backgroundColor: colorsm.formInputBackgroundSelected,
              color: colorsm.formInputTextSelected,
              '::after': {
                display: 'block',
                background:
                  colorsm.formInputBackgroundSelected +
                  // eslint-disable-next-line rulesdir/typography
                  ' url(\'data:image/svg+xml; utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path fill="' +
                  // TODO: The # needs escaped for the SVG to render the checkmark with color. Really we need to replace this entire component with soemthing like SelectCell
                  colorsm.formInputTextSelected +
                  // eslint-disable-next-line rulesdir/typography
                  '" d="M0 11l2-2 5 5L18 3l2 2L7 18z"/></svg>\') 9px 9px',
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
                border: '2px solid ' + colorsm.formInputBorderSelected,
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
