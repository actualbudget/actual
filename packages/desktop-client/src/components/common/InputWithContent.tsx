import {
  type ComponentPropsWithRef,
  type ReactNode,
  type CSSProperties,
  forwardRef,
} from 'react';

import { css } from '@emotion/css';

import { theme } from '../../style';

import { Input, defaultInputStyle } from './Input';
import { View } from './View';

type InputWithContentProps = ComponentPropsWithRef<typeof Input> & {
  leftContent?: ReactNode;
  rightContent?: ReactNode;
  inputStyle?: CSSProperties;
};
export const InputWithContent = forwardRef<
  HTMLInputElement,
  InputWithContentProps
>(({ leftContent, rightContent, inputStyle, style, ...props }, ref) => {
  return (
    <View
      style={{
        ...defaultInputStyle,
        padding: 0,
        flexDirection: 'row',
        alignItems: 'center',
        ...style,
      }}
      className={css({
        '&:focus-within': {
          boxShadow: '0 0 0 1px ' + theme.formInputShadowSelected,
        },
        '& input, input[data-focused], input[data-hovered]': {
          border: 0,
          backgroundColor: 'transparent',
          boxShadow: 'none',
          color: 'inherit',
        },
      })}
    >
      {leftContent}
      <Input
        ref={ref}
        {...props}
        style={{
          width: '100%',
          flex: 1,
          ...inputStyle,
        }}
      />
      {rightContent}
    </View>
  );
});

InputWithContent.displayName = 'InputWithContent';
