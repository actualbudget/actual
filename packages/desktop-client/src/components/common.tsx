import React, { type ComponentProps, type ReactNode, forwardRef } from 'react';
import { useMatch, useNavigate } from 'react-router-dom';

import { type CSSProperties } from 'glamor';

import { colors } from '../style';

import Button from './common/Button';

export { default as AlignedText } from './common/AlignedText';
export { default as AnchorLink } from './common/AnchorLink';
export { default as Block } from './common/Block';
export { default as Button, ButtonWithLoading } from './common/Button';
export { default as Card } from './common/Card';
export { default as Select } from './common/Select';
export { default as FormError } from './common/FormError';
export { default as HoverTarget } from './common/HoverTarget';
export { default as InitialFocus } from './common/InitialFocus';
export { default as InlineField } from './common/InlineField';
export { default as Input } from './common/Input';
export { default as InputWithContent } from './common/InputWithContent';
export { default as Label } from './common/Label';
export { default as Menu } from './common/Menu';
export { default as MenuButton } from './common/MenuButton';
export { default as MenuTooltip } from './common/MenuTooltip';
export { default as Modal, ModalButtons } from './common/Modal';
export { default as Search } from './common/Search';
export { default as Stack } from './Stack';
export { default as Text } from './common/Text';
export { default as TextOneLine } from './common/TextOneLine';
export { default as View } from './common/View';
export { default as LinkButton } from './common/LinkButton';

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

export * from './tooltips';
export { useTooltip } from './tooltips';
