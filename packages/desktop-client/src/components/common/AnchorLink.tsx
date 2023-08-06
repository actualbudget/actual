import { type ReactNode } from 'react';
import { NavLink, useMatch } from 'react-router-dom';

import { type CSSProperties, css } from 'glamor';

import { styles } from '../../style';

type AnchorLinkProps = {
  to: string;
  style?: CSSProperties;
  activeStyle?: CSSProperties;
  children?: ReactNode;
};

export default function AnchorLink({
  to,
  style,
  activeStyle,
  children,
}: AnchorLinkProps) {
  let match = useMatch({ path: to });

  return (
    <NavLink
      to={to}
      className={css([
        styles.smallText,
        style,
        match ? activeStyle : null,
      ]).toString()}
    >
      {children}
    </NavLink>
  );
}
