import React from 'react';
import type { ComponentPropsWithoutRef, ReactNode } from 'react';

import { css, cx } from '@emotion/css';
import type { CSSObject } from '@emotion/serialize';

import { Button } from './Button';
import {
  componentSizeIcon,
  sizeResponsiveStyles,
  type IconButtonSize,
} from './tokens';

type IconButtonProps = Omit<
  ComponentPropsWithoutRef<typeof Button>,
  'size' | 'children'
> & {
  size?: IconButtonSize;
  variant?: 'bare' | 'normal';
  children: ReactNode;
  'aria-label': string;
};

const iconButtonClassNames: Record<IconButtonSize, string> = {
  small: css(sizeResponsiveStyles(componentSizeIcon.small) as CSSObject),
  medium: css(sizeResponsiveStyles(componentSizeIcon.medium) as CSSObject),
  large: css(sizeResponsiveStyles(componentSizeIcon.large) as CSSObject),
};

export function IconButton({
  size = 'medium',
  variant = 'bare',
  className,
  style,
  children,
  ...props
}: IconButtonProps) {
  return (
    <Button
      {...props}
      variant={variant}
      className={
        typeof className === 'function'
          ? renderProps =>
              cx(iconButtonClassNames[size], className(renderProps))
          : cx(iconButtonClassNames[size], className)
      }
      style={renderProps => ({
        padding: 0,
        ...(typeof style === 'function' ? style(renderProps) : style),
      })}
    >
      {children}
    </Button>
  );
}
