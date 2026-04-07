import React, { forwardRef } from 'react';
import type { HTMLProps, Ref } from 'react';

import { css, cx } from '@emotion/css';

import type { CSSProperties } from './styles';

type ViewProps = Omit<HTMLProps<HTMLDivElement>, 'style'> & {
  className?: string;
  style?: CSSProperties;
  nativeStyle?: CSSProperties;
  innerRef?: Ref<HTMLDivElement>;
};

export const View = forwardRef<HTMLDivElement, ViewProps>((props, ref) => {
  const defaultStyles: CSSProperties = {
    alignItems: 'stretch',
    borderWidth: 0,
    borderStyle: 'solid',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    margin: 0,
    padding: 0,
    position: 'relative',
    /* fix flexbox bugs */
    minHeight: 0,
    minWidth: 0,
  };

  const { className = '', style, nativeStyle, innerRef, ...restProps } = props;

  return (
    <div
      {...restProps}
      ref={innerRef ?? ref}
      style={{
        ...defaultStyles,
        ...nativeStyle,
      }}
      className={cx(
        'view',
        className,
        style && Object.keys(style).length > 0 ? css(style) : undefined,
      )}
    />
  );
});

View.displayName = 'View';
