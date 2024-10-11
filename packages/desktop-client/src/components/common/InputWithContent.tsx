import {
  type ComponentPropsWithRef,
  type ReactNode,
  type CSSProperties,
  forwardRef,
} from 'react';

import { css } from '@emotion/css';

import { theme } from '../../style';

import { Input } from './Input';
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
          outline: 0,
          backgroundColor: theme.tableBackground,
          color: theme.formInputText,
          margin: 0,
          borderRadius: 4,
          border: '1px solid ' + theme.formInputBorder,
          padding: 0,
          flexDirection: 'row',
          alignItems: 'center',
          ...style,
        }}
      />
      {rightContent}
    </View>
  );
});

InputWithContent.displayName = 'InputWithContent';
