import {
  type ElementType,
  useState,
  type ComponentProps,
  type ReactNode,
  type FocusEvent,
} from 'react';

import { type CSSProperties, theme } from '../../style';

import { Input, defaultInputStyle } from './Input';
import { InputWithTags } from './InputWithTags';
import { View } from './View';

type InputWithContentProps = ComponentProps<typeof Input> & {
  leftContent?: ReactNode;
  rightContent?: ReactNode;
  inputStyle?: CSSProperties;
  focusStyle?: CSSProperties;
  style?: CSSProperties;
  getStyle?: (focused: boolean) => CSSProperties;
  inputWithTags?: boolean;
};

export function InputWithContent({
  leftContent,
  rightContent,
  inputStyle,
  focusStyle,
  style,
  getStyle,
  inputWithTags,
  ...props
}: InputWithContentProps) {
  const [focused, setFocused] = useState(props.focused ?? false);
  const InputType: ElementType = inputWithTags ? InputWithTags : Input;

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
      <InputType
        {...props}
        focused={focused}
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
        onFocus={(e: FocusEvent<HTMLInputElement>) => {
          setFocused(true);
          props.onFocus?.(e);
        }}
        onBlur={(e: FocusEvent<HTMLInputElement>) => {
          setFocused(false);
          props.onBlur?.(e);
        }}
      />
      {rightContent}
    </View>
  );
}
