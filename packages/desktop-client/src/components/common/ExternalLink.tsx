import React, { type ReactNode, forwardRef } from 'react';

import { colors } from '../../style';

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

const ExternalLink = forwardRef<HTMLAnchorElement, ExternalLinkProps>(
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

export default ExternalLink;
