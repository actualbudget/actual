import React from 'react';
import type { ReactNode } from 'react';

import { theme } from '@actual-app/components/theme';
import { css } from '@emotion/css';

type TooltipCardProps = {
  title: ReactNode;
  children: ReactNode;
};

/**
 * The card report graph tooltips are drawn in, with a title above.
 */
export function TooltipCard({ title, children }: TooltipCardProps) {
  return (
    <div
      className={css({
        zIndex: 1000,
        pointerEvents: 'none',
        borderRadius: 2,
        boxShadow: '0 1px 6px rgba(0, 0, 0, .20)',
        backgroundColor: theme.menuBackground,
        color: theme.menuItemText,
        padding: 10,
      })}
    >
      <div style={{ marginBottom: 10 }}>
        <strong>{title}</strong>
      </div>
      <div style={{ lineHeight: 1.5 }}>{children}</div>
    </div>
  );
}
