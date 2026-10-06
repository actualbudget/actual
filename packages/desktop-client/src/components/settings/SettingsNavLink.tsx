import type { ComponentType, SVGProps } from 'react';
import { NavLink } from 'react-router';

import { styles } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';
import { radius, spacing } from '@actual-app/components/tokens';
import { css } from '@emotion/css';

type SettingsNavLinkProps = {
  title: string;
  Icon:
    | ComponentType<SVGProps<SVGElement>>
    | ComponentType<SVGProps<SVGSVGElement>>;
  to: string;
  end?: boolean;
};

export function SettingsNavLink({
  title,
  Icon,
  to,
  end,
}: SettingsNavLinkProps) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        css({
          ...styles.smallText,
          display: 'flex',
          alignItems: 'center',
          gap: spacing.sm,
          padding: spacing.sm,
          borderRadius: radius.sm,
          textDecoration: 'none',
          fontWeight: isActive ? 600 : 500,
          color: isActive ? theme.pillTextSelected : theme.pageText,
          backgroundColor: isActive
            ? theme.pillBackgroundSelected
            : 'transparent',
          ':hover': {
            backgroundColor: isActive
              ? theme.pillBackgroundSelected
              : theme.tableRowBackgroundHover,
          },
        })
      }
    >
      <Icon width={15} height={15} style={{ flexShrink: 0 }} />
      {title}
    </NavLink>
  );
}
