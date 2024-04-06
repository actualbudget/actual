import React, { MouseEventHandler, type ComponentProps, type ReactNode } from 'react';
import { NavLink, useMatch } from 'react-router-dom';

import { css } from 'glamor';

import { type CustomReportEntity } from 'loot-core/types/models/reports';

import { useNavigate } from '../../hooks/useNavigate';
import { type CSSProperties, styles } from '../../style';

import { Button } from './Button';
import { Text } from './Text';

type ClickLinkProps = {
  to: string;
  style?: CSSProperties;
  onClick?: MouseEventHandler;
  children?: ReactNode;
};

type ButtonLinkProps = ComponentProps<typeof Button> & {
  to: string;
  activeStyle?: CSSProperties;
};

type InternalLinkProps = {
  to: string;
  style?: CSSProperties;
  activeStyle?: CSSProperties;
  children?: ReactNode;
  report?: CustomReportEntity;
};

const ClickLink = ({ to, style, onClick, children }: ClickLinkProps) => {
  return (
    <Text
      style={{
        ':hover': {
          textDecoration: 'underline',
          boxShadow: 'none',
          cursor: 'default',
        },
        ...style,
      }}
      onClick={onClick}
    >
      {children}
    </Text>
  );
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

const InternalLink = ({
  to,
  style,
  activeStyle,
  children,
  report,
}: InternalLinkProps) => {
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
  | ({ variant?: 'internal' } & InternalLinkProps)
  | ({ variant?: 'click' } & ClickLinkProps);

export function Link({ variant = 'internal', ...props }: LinkProps) {
  switch (variant) {
    case 'internal':
      return <InternalLink {...props} />;

    case 'button':
      return <ButtonLink {...props} />;

    case 'click':
      return <ClickLink {...props} />;

    default:
      throw new Error(`Unrecognised link type: ${variant}`);
  }
}
