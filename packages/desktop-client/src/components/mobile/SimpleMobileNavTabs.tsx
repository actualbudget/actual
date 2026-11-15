import React from 'react';
import type { ComponentType, CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router';

import { useResponsive } from '@actual-app/components/hooks/useResponsive';
import {
  SvgAdd,
  SvgPiggyBank,
  SvgReports,
  SvgWallet,
} from '@actual-app/components/icons/v1';
import { SvgCalendar3 } from '@actual-app/components/icons/v2';
import { styles } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

export const SIMPLE_MOBILE_NAV_HEIGHT = 56;

export function SimpleMobileNavTabs() {
  const { t } = useTranslation();
  const { isNarrowWidth } = useResponsive();

  const navTabs = [
    { name: t('Budget'), path: '/budget', Icon: SvgWallet },
    { name: t('Accounts'), path: '/accounts', Icon: SvgPiggyBank },
    { name: t('Transaction'), path: '/transactions/new', Icon: SvgAdd },
    { name: t('Schedules'), path: '/schedules', Icon: SvgCalendar3 },
    { name: t('Reports'), path: '/reports', Icon: SvgReports },
  ];

  return (
    <nav
      // Kept so existing e2e page models can still locate the navbar.
      data-navbar-state="default"
      style={{
        backgroundColor: theme.mobileNavBackground,
        borderTop: `1px solid ${theme.menuBorder}`,
        ...styles.shadow,
        width: '100%',
        position: 'fixed',
        zIndex: 100,
        bottom: 0,
        paddingBottom: 'env(safe-area-inset-bottom)',
        ...(!isNarrowWidth && { display: 'none' }),
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          height: SIMPLE_MOBILE_NAV_HEIGHT,
          width: '100%',
        }}
      >
        {navTabs.map(tab => (
          <NavTab key={tab.path} {...tab} />
        ))}
      </View>
    </nav>
  );
}

type NavTabIconProps = {
  width: number;
  height: number;
  style?: CSSProperties;
};

type NavTabProps = {
  name: string;
  path: string;
  Icon: ComponentType<NavTabIconProps>;
};

function NavTab({ Icon: TabIcon, name, path }: NavTabProps) {
  return (
    <NavLink
      to={path}
      aria-label={name}
      title={name}
      style={({ isActive }) => ({
        ...styles.noTapHighlight,
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: isActive ? theme.mobileNavItemSelected : theme.mobileNavItem,
        textDecoration: 'none',
        userSelect: 'none',
      })}
    >
      <TabIcon width={24} height={24} style={{ minHeight: 24 }} />
    </NavLink>
  );
}
