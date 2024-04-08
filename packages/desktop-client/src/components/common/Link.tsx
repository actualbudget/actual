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
import { theme } from '../../style/theme';

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

const externalLinkColors = {
  purple: theme.pageTextPositive,
  blue: theme.pageTextLink,
  muted: 'inherit',
};

type ExternalLinkProps = {
  children?: ReactNode;
  to?: string;
  linkColor?: keyof typeof externalLinkColors;
};

const ExternalLink = ({
  children,
  to,
  linkColor = 'blue',
}: ExternalLinkProps) => {
  return (
    // we can’t use <ExternalLink /> here for obvious reasons
    // eslint-disable-next-line no-restricted-syntax
    <a
      href={to ?? ''}
      target="_blank"
      rel="noopener noreferrer"
      style={{ color: externalLinkColors[linkColor] }}
    >
      {children}
    </a>
  );
};

const TextLink = ({ style, onClick, children, ...props }: TextLinkProps) => {
  return (
    <Text
      style={{
        backgroundColor: 'transparent',
        display: 'inline',
        border: 0,
        cursor: 'pointer',
        ':hover': {
          textDecoration: 'underline',
          boxShadow: 'none',
        },
        ...style,
      }}
      {...props}
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
  | ({ variant?: 'external' } & ExternalLinkProps)
  | ({ variant?: 'text' } & TextLinkProps);

export function Link({ variant = 'internal', ...props }: LinkProps) {
  switch (variant) {
    case 'internal':
      return <InternalLink {...props} />;

    case 'external':
      return <ExternalLink {...props} />;

    case 'button':
      return <ButtonLink {...props} />;

    case 'text':
      return <TextLink {...props} />;

    default:
      throw new Error(`Unrecognised link type: ${variant}`);
  }
}
