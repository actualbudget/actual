import React, { type ComponentProps } from 'react';
import { useMatch, useNavigate } from 'react-router-dom';

import { type CSSProperties } from 'glamor';

import Button from './Button';

type ButtonLinkProps = ComponentProps<typeof Button> & {
  to: string;
  activeStyle?: CSSProperties;
};
export default function ButtonLink({
  to,
  style,
  activeStyle,
  ...props
}: ButtonLinkProps) {
  const navigate = useNavigate();
  const match = useMatch({ path: to });
  return (
    <Button
      style={{
        ...style,
        ...(match ? activeStyle : {}),
      }}
      activeStyle={activeStyle}
      {...props}
      onClick={e => {
        props.onClick?.(e);
        navigate(to);
      }}
    />
  );
}
