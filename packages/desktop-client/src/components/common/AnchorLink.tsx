import { type ReactNode } from 'react';
import { NavLink, useMatch } from 'react-router-dom';

import { css } from 'glamor';

import { type CSSProperties, styles } from '../../style';

type AnchorLinkProps = {
  to: string;
  style?: CSSProperties;
  activeStyle?: CSSProperties;
  children?: ReactNode;
};

export function AnchorLink({
  to,
  style,
  activeStyle,
  children,
}: AnchorLinkProps) {
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
}
