import React, { type ReactNode, forwardRef } from 'react';

import { theme } from '../../style';

const externalLinkColors = {
  purple: theme.pageTextPositive,
  blue: theme.pageTextLink,
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
