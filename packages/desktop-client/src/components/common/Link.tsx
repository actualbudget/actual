import React, { type ComponentProps, type ReactNode } from 'react';
import { NavLink, useMatch } from 'react-router-dom';

import { css } from 'glamor';

import { type CustomReportEntity } from 'loot-core/types/models/reports';

import { useNavigate } from '../../hooks/useNavigate';
import { type CSSProperties, styles } from '../../style';

import { Button } from './Button';

type ButtonLinkProps = ComponentProps<typeof Button> & {
  to: string;
  activeStyle?: CSSProperties;
};

type AnchorLinkProps = {
  to: string;
  style?: CSSProperties;
  activeStyle?: CSSProperties;
  children?: ReactNode;
  report?: CustomReportEntity;
};

const ButtonLink = ({ to, style, activeStyle, ...props }: ButtonLinkProps) => {
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
};

const AnchorLink = ({
  to,
  style,
  activeStyle,
  children,
  report,
}: AnchorLinkProps) => {
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
};

type LinkProps =
  | ({
      variant: 'button';
    } & ButtonLinkProps)
  | ({ variant?: 'anchor' } & AnchorLinkProps);

export function Link({ variant = 'anchor', ...props }: LinkProps) {
  switch (variant) {
    case 'anchor':
      return <AnchorLink {...props} />;

    case 'button':
      return <ButtonLink {...props} />;

    default:
      throw new Error(`Unrecognised link type: ${variant}`);
  }
}
