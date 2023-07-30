import React, { type ComponentProps, type ReactNode, forwardRef } from 'react';
import { useMatch, useNavigate } from 'react-router-dom';

import { type CSSProperties } from 'glamor';

import { colors } from '../style';

import Button from './common/Button';

export { default as AnchorLink } from './common/AnchorLink';
export { default as Button, ButtonWithLoading } from './common/Button';
export { default as Select } from './common/Select';
export { default as Input } from './common/Input';
export { default as Menu } from './common/Menu';
export { default as Stack } from './common/Stack';
export { default as Text } from './common/Text';
export { default as View } from './common/View';

let externalLinkColors = {
  purple: colors.p4,
  blue: colors.b4,
  muted: 'inherit',
};
type ExternalLinkProps = {
  children?: ReactNode;
  to: string;
  linkColor?: keyof typeof externalLinkColors;
};

export const ExternalLink = forwardRef<HTMLAnchorElement, ExternalLinkProps>(
  ({ children, to, linkColor = 'blue' }, ref) => (
    // we can’t use <ExternalLink /> here for obvious reasons
    // eslint-disable-next-line no-restricted-syntax
    <a
      ref={ref}
      href={to}
      target="_blank"
      rel="noopener noreferrer"
      style={{ color: externalLinkColors[linkColor] }}
    >
      {children}
    </a>
  ),
);

type ButtonLinkProps = ComponentProps<typeof Button> & {
  to: string;
  activeStyle?: CSSProperties;
};
export function ButtonLink({
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
      {...props}
      onClick={e => {
        props.onClick?.(e);
        navigate(to);
      }}
    />
  );
}
