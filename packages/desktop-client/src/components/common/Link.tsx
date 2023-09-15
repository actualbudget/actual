import React, { type ReactNode, type ComponentProps } from 'react';
import { NavLink, useMatch, useNavigate } from 'react-router-dom';

import { css } from 'glamor';

import { type CSSProperties, styles } from '../../style';

import Button from './Button';

type ButtonLinkProps = ComponentProps<typeof Button> & {
  to: string;
  activeStyle?: CSSProperties;
};

type AnchorLinkProps = {
  to: string;
  style?: CSSProperties;
  activeStyle?: CSSProperties;
  children?: ReactNode;
};

const ButtonLink = ({
  to,
  style,
  activeStyle,
  onClick,
  ...props
}: ButtonLinkProps) => {
  const navigate = useNavigate();
  const match = useMatch({ path: to });

  const handleClick = e => {
    onClick?.(e);
    navigate(to);
  };

  return (
    <Button
      style={{
        ...style,
        ...(match ? activeStyle : {}),
      }}
      activeStyle={activeStyle}
      {...props}
      onClick={handleClick}
    />
  );
};

const AnchorLink = ({ to, style, activeStyle, children }: AnchorLinkProps) => {
  const match = useMatch({ path: to });

  return (
    <NavLink
      to={to}
      className={`${css([
        styles.smallText,
        style,
        match ? activeStyle : null,
      ])}`}
    >
      {children}
    </NavLink>
  );
};

type LinkProps = {
  to: string;
  linkType?: 'button' | 'anchor';
  style?: CSSProperties;
  activeStyle?: CSSProperties;
  children?: ReactNode;
};

export default function Link({ linkType = 'anchor', ...props }: LinkProps) {
  switch (linkType) {
    case 'anchor':
      return <AnchorLink {...props} />;

    case 'button':
      return <ButtonLink {...props} />;

    default:
      return null;
  }
}
