import React, { type ReactNode, type ComponentProps } from 'react';

import { type CSSProperties } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { css } from '@emotion/css';

type SectionLabelProps = {
  title?: string;
  style?: CSSProperties;
};

export const SectionLabel = ({ title, style }: SectionLabelProps) => {
  return (
    <View
      style={{
        fontWeight: 500,
        textTransform: 'uppercase',
        color: theme.formLabelText,
        marginBottom: 5,
        lineHeight: '1em',
        ...style,
      }}
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
      style={{
        fontSize: 13,
        marginBottom: 3,
        color: theme.tableText,
        ...style,
      }}
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

type CheckboxProps = ComponentProps<'input'> & {
  style?: CSSProperties;
};

export const Checkbox = (props: CheckboxProps) => {
  return (
    <input
      type="checkbox"
      {...props}
      className={css([
        {
          position: 'relative',
          margin: 0,
          flexShrink: 0,
          marginRight: 6,
          width: 15,
          height: 15,
          appearance: 'none',
          outline: 0,
          border: '1px solid ' + theme.formInputBorder,
          borderRadius: 4,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: theme.checkboxText,
          backgroundColor: theme.tableBackground,
          ':checked': {
            border: '1px solid ' + theme.checkboxBorderSelected,
            backgroundColor: theme.checkboxBackgroundSelected,
            '::after': {
              display: 'block',
              background:
                theme.checkboxBackgroundSelected +
                // eslint-disable-next-line actual/typography
                ' url(\'data:image/svg+xml; utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path fill="white" d="M0 11l2-2 5 5L18 3l2 2L7 18z"/></svg>\') 9px 9px',
              width: 9,
              height: 9,
              // eslint-disable-next-line actual/typography
              content: '" "',
            },
          },
          ':disabled': {
            border: '1px solid ' + theme.buttonNormalDisabledBorder,
            backgroundColor: theme.buttonNormalDisabledBorder,
          },
          ':checked:disabled': {
            border: '1px solid ' + theme.buttonNormalDisabledBorder,
            backgroundColor: theme.buttonNormalDisabledBorder,
            '::after': {
              backgroundColor: theme.buttonNormalDisabledBorder,
            },
          },
          '&.focus-visible:focus': {
            '::before': {
              position: 'absolute',
              top: -5,
              bottom: -5,
              left: -5,
              right: -5,
              border: '2px solid ' + theme.checkboxBorderSelected,
              borderRadius: 6,
              // eslint-disable-next-line actual/typography
              content: '" "',
            },
          },
        },
        props.style,
      ])}
    />
  );
};
