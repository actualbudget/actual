import type { ComponentType, SVGProps } from 'react';
import { NavLink } from 'react-router';

import { useResponsive } from '@actual-app/components/hooks/useResponsive';
import { SvgCheveronRight } from '@actual-app/components/icons/v1';
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
};

export function SettingsNavLink({ title, Icon, to }: SettingsNavLinkProps) {
  const { isNarrowWidth } = useResponsive();

  if (isNarrowWidth) {
    return (
      <NavLink
        to={to}
        className={css({
          ...styles.mediumText,
          display: 'flex',
          alignItems: 'center',
          gap: spacing.md,
          minHeight: styles.mobileMinHeight,
          paddingInline: spacing.lg,
          textDecoration: 'none',
          color: theme.settingsNavItemText,
          '& + &': { borderTop: `1px solid ${theme.settingsNavBorder}` },
        })}
      >
        <Icon width={16} height={16} style={{ flexShrink: 0 }} />
        <span style={{ flex: 1 }}>{title}</span>
        <SvgCheveronRight
          width={20}
          height={20}
          style={{ flexShrink: 0, opacity: 0.5 }}
        />
      </NavLink>
    );
  }

  return (
    <NavLink
      to={to}
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
          color: isActive
            ? theme.settingsNavItemTextSelected
            : theme.settingsNavItemText,
          backgroundColor: isActive
            ? theme.settingsNavItemBackgroundSelected
            : 'transparent',
          ':hover': {
            backgroundColor: isActive
              ? theme.settingsNavItemBackgroundSelected
              : theme.settingsNavItemBackgroundHover,
          },
        })
      }
    >
      <Icon width={15} height={15} style={{ flexShrink: 0 }} />
      {title}
    </NavLink>
  );
}
