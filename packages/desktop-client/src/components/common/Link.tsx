import React, {
  type MouseEventHandler,
  type ComponentProps,
  type ReactNode,
} from 'react';
import { NavLink, useMatch } from 'react-router-dom';

import { css } from 'glamor';

import { type CustomReportEntity } from 'loot-core/types/models/reports';

import { useNavigate } from '../../hooks/useNavigate';
import { type CSSProperties, styles } from '../../style';

import { Button } from './Button';
import { Text } from './Text';

type TextLinkProps = {
  style?: CSSProperties;
  onClick?: MouseEventHandler;
  children?: ReactNode;
};

type ButtonLinkProps = ComponentProps<typeof Button> & {
  to?: string;
  activeStyle?: CSSProperties;
};

type InternalLinkProps = {
  to?: string;
  style?: CSSProperties;
  activeStyle?: CSSProperties;
  children?: ReactNode;
  report?: CustomReportEntity;
};

const TextLink = ({ style, onClick, children }: TextLinkProps) => {
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
  const path = to ?? '';
  const match = useMatch({ path });
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
        navigate(path);
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
  const path = to ?? '';
  const match = useMatch({ path });

  return (
    <NavLink
      to={path}
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
  | ({ variant?: 'text' } & TextLinkProps);

export function Link({ variant = 'internal', ...props }: LinkProps) {
  switch (variant) {
    case 'internal':
      return <InternalLink {...props} />;

    case 'button':
      return <ButtonLink {...props} />;

    case 'text':
      return <TextLink {...props} />;

    default:
      throw new Error(`Unrecognised link type: ${variant}`);
  }
}
