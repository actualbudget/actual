import { type ComponentPropsWithRef, type ReactNode, forwardRef } from 'react';

import { css, cx } from '@emotion/css';

import { theme } from '../../style';

import { Input } from './Input';
import { View } from './View';

type InputWithContentProps = ComponentPropsWithRef<typeof Input> & {
  leftContent?: ReactNode;
  rightContent?: ReactNode;
  containerClassName?: string;
};
export const InputWithContent = forwardRef<
  HTMLInputElement,
  InputWithContentProps
>(({ leftContent, rightContent, containerClassName, ...props }, ref) => {
  return (
    <View
      className={cx(
        css({
          backgroundColor: theme.tableBackground,
          color: theme.formInputText,
          flexDirection: 'row',
          alignItems: 'center',
          borderRadius: 4,
          '&:focus-within': {
            boxShadow: '0 0 0 1px ' + theme.formInputShadowSelected,
          },
          '& input, input[data-focused], input[data-hovered]': {
            border: 0,
            backgroundColor: 'transparent',
            boxShadow: 'none',
            color: 'inherit',
          },
        }),
        containerClassName,
      )}
    >
      {leftContent}
      <Input ref={ref} {...props} />
      {rightContent}
    </View>
  );
});

InputWithContent.displayName = 'InputWithContent';
