import { type ComponentProps, type ReactNode, useState } from 'react';

import { type CSSProperties } from 'glamor';

import { colors } from '../../style';

import Input, { defaultInputStyle } from './Input';
import View from './View';

type InputWithContentProps = ComponentProps<typeof Input> & {
  id: string;
  leftContent: ReactNode;
  rightContent: ReactNode;
  inputStyle?: CSSProperties;
  style?: CSSProperties;
  getStyle?: (focused: boolean) => CSSProperties;
};
export default function InputWithContent({
  id,
  leftContent,
  rightContent,
  inputStyle,
  style,
  getStyle,
  ...props
}: InputWithContentProps) {
  let [focused, setFocused] = useState(false);

  return (
    <View
      style={[
        defaultInputStyle,
        {
          padding: 0,
          flex: 1,
          flexDirection: 'row',
          alignItems: 'center',
        },
        focused && {
          backgroundColor: colors.formInputBackground,
          border: '1px solid ' + colors.formInputBorderSelected,
          boxShadow: '0 1px 1px ' + colors.formInputShadowSelected,
        },
        style,
        getStyle && getStyle(focused),
      ]}
    >
      {leftContent}
      <Input
        id={id}
        {...props}
        style={[
          inputStyle,
          {
            flex: 1,
            '&, &:focus, &:hover': {
              border: 0,
              backgroundColor: 'transparent',
              boxShadow: 'none',
              color: 'inherit',
            },
          },
        ]}
        onFocus={e => {
          setFocused(true);
          props.onFocus && props.onFocus(e);
        }}
        onBlur={e => {
          setFocused(false);
          props.onBlur && props.onBlur(e);
        }}
      />
      {rightContent}
    </View>
  );
}
