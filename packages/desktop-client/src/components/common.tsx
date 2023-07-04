import React, {
  useRef,
  useLayoutEffect,
  useCallback,
  type ComponentProps,
  type ReactNode,
  forwardRef,
} from 'react';
import { NavLink, useMatch, useNavigate } from 'react-router-dom';

import { type CSSProperties, css } from 'glamor';

import { styles, colors } from '../style';
import type { HTMLPropsWithStyle } from '../types/utils';

import Button from './common/Button';

export { default as AlignedText } from './common/AlignedText';
export { default as Block } from './common/Block';
export { default as Button, ButtonWithLoading } from './common/Button';
export { default as Card } from './common/Card';
export { default as CustomSelect } from './common/CustomSelect';
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
export { default as Select } from './common/Select';
export { default as Stack } from './Stack';
export { default as Text } from './common/Text';
export { default as TextOneLine } from './common/TextOneLine';
export { default as View } from './common/View';

type UseStableCallbackArg = (...args: unknown[]) => unknown;

export const useStableCallback = (callback: UseStableCallbackArg) => {
  const callbackRef = useRef<UseStableCallbackArg>();
  const memoCallback = useCallback(
    (...args) => callbackRef.current && callbackRef.current(...args),
    [],
  );
  useLayoutEffect(() => {
    callbackRef.current = callback;
  });
  return memoCallback;
};

type LinkProps = ComponentProps<typeof Button>;

export function LinkButton({ style, children, ...nativeProps }: LinkProps) {
  return (
    <Button
      style={[
        {
          textDecoration: 'none',
          color: styles.textColor,
          backgroundColor: 'transparent',
          display: 'inline',
          border: 0,
          cursor: 'pointer',
          padding: 0,
          font: 'inherit',
          ':hover': {
            textDecoration: 'underline',
            boxShadow: 'none',
          },
          ':focus': {
            boxShadow: 'none',
          },
        },
        styles.smallText,
        style,
      ]}
      {...nativeProps}
    >
      {children}
    </Button>
  );
}

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
  let match = useMatch({ path: to });

  return (
    <NavLink
      to={to}
      {...css([styles.smallText, style, match ? activeStyle : null])}
    >
      {children}
    </NavLink>
  );
}

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
        props.onClick && props.onClick(e);
        navigate(to);
      }}
    />
  );
}

type PProps = HTMLPropsWithStyle<HTMLDivElement> & {
  isLast?: boolean;
};
export function P({ style, isLast, children, ...props }: PProps) {
  return (
    <div
      {...props}
      {...css(!isLast && { marginBottom: 15 }, style, { lineHeight: '1.5em' })}
    >
      {children}
    </div>
  );
}

export * from './tooltips';
export { useTooltip } from './tooltips';
