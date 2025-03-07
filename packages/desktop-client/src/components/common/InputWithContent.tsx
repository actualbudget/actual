import { useState, type ComponentProps, type ReactNode } from 'react';

import { View } from '@actual-app/components/view';

import { theme, type CSSProperties } from '../../style';

import { Input, defaultInputStyle } from './Input';

type InputWithContentProps = ComponentProps<typeof Input> & {
  leftContent?: ReactNode;
  rightContent?: ReactNode;
  inputStyle?: CSSProperties;
  focusStyle?: CSSProperties;
  style?: CSSProperties;
  getStyle?: (focused: boolean) => CSSProperties;
  focused?: boolean;
};
export function InputWithContent({
  leftContent,
  rightContent,
  inputStyle,
  focusStyle,
  style,
  getStyle,
  ...props
}: InputWithContentProps) {
  const [focused, setFocused] = useState(props.focused ?? false);

  return (
    <View
      style={{
        ...defaultInputStyle,
        padding: 0,
        flexDirection: 'row',
        alignItems: 'center',
        ...style,
        ...(focused &&
          (focusStyle ?? {
            boxShadow: '0 0 0 1px ' + theme.formInputShadowSelected,
          })),
        ...getStyle?.(focused),
      }}
    >
      {leftContent}
      <Input
        {...props}
        style={{
          width: '100%',
          ...inputStyle,
          flex: 1,
          '&, &:focus, &:hover': {
            border: 0,
            backgroundColor: 'transparent',
            boxShadow: 'none',
            color: 'inherit',
          },
        }}
        onFocus={e => {
          setFocused(true);
          props.onFocus?.(e);
        }}
        onBlur={e => {
          setFocused(false);
          props.onBlur?.(e);
        }}
      />
      {rightContent}
    </View>
  );
}
