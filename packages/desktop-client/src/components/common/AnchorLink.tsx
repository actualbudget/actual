import { type ReactNode } from 'react';
import { NavLink, useMatch } from 'react-router-dom';

import { css } from 'glamor';

import { type CustomReportEntity } from 'loot-core/src/types/models';

import { type CSSProperties, styles } from '../../style';

type AnchorLinkProps = {
  to: string;
  style?: CSSProperties;
  activeStyle?: CSSProperties;
  children?: ReactNode;
  report?: CustomReportEntity;
};

export function AnchorLink({
  to,
  style,
  activeStyle,
  children,
  report,
}: AnchorLinkProps) {
  const match = useMatch({ path: to });

  return (
    <NavLink
      to={to}
      state={report ? { report } : {}}
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
