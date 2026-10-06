import React from 'react';
import type { ComponentType, SVGProps } from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router';

import {
  SvgBeaker,
  SvgCog,
  SvgCreditCard,
  SvgStoreFront,
  SvgTag,
  SvgTuning,
} from '@actual-app/components/icons/v1';
import { SvgSettingsSliderAlternate } from '@actual-app/components/icons/v2';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { css } from '@emotion/css';

import { useIsTestEnv } from '#hooks/useIsTestEnv';
import { useLocalPref } from '#hooks/useLocalPref';
import { useSyncServerStatus } from '#hooks/useSyncServerStatus';

type NavItem = {
  title: string;
  to: string;
  Icon:
    | ComponentType<SVGProps<SVGElement>>
    | ComponentType<SVGProps<SVGSVGElement>>;
};

// Both states are declared in one rule so the active background always wins
// over the hover background, whatever order emotion emits the classes in.
const linkStyle = (isActive: boolean) =>
  css({
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 14px',
    borderRadius: 6,
    textDecoration: 'none',
    fontSize: 15,
    fontWeight: isActive ? 600 : 400,
    color: isActive ? theme.pillTextSelected : theme.pageText,
    backgroundColor: isActive ? theme.pillBackgroundSelected : 'transparent',
    '&:hover': {
      backgroundColor: isActive
        ? theme.pillBackgroundSelected
        : theme.tableRowBackgroundHover,
    },
  });

export function SettingsNav() {
  const { t } = useTranslation();
  const syncServerStatus = useSyncServerStatus();
  const isTestEnv = useIsTestEnv();
  const isUsingServer = syncServerStatus !== 'no-server' || isTestEnv;
  const [showExperimental = false] = useLocalPref('settings.showExperimental');

  const items: NavItem[] = [
    { title: t('General'), to: '/settings', Icon: SvgCog },
    { title: t('Payees'), to: '/settings/payees', Icon: SvgStoreFront },
    { title: t('Rules'), to: '/settings/rules', Icon: SvgTuning },
    ...(isUsingServer
      ? [
          {
            title: t('Bank Sync'),
            to: '/settings/bank-sync',
            Icon: SvgCreditCard,
          },
        ]
      : []),
    { title: t('Tags'), to: '/settings/tags', Icon: SvgTag },
    {
      title: t('Advanced'),
      to: '/settings/advanced',
      Icon: SvgSettingsSliderAlternate,
    },
    ...(showExperimental
      ? [
          {
            title: t('Experimental'),
            to: '/settings/experimental',
            Icon: SvgBeaker,
          },
        ]
      : []),
  ];

  return (
    <View
      role="navigation"
      aria-label={t('Settings')}
      style={{ width: 220, flexShrink: 0, gap: 2, paddingRight: 20 }}
    >
      {items.map(({ title, to, Icon }) => (
        <NavLink
          key={to}
          to={to}
          // `end` keeps General from matching every nested settings route.
          end={to === '/settings'}
          className={({ isActive }) => linkStyle(isActive)}
        >
          <Icon width={14} height={14} style={{ flexShrink: 0 }} />
          {title}
        </NavLink>
      ))}
    </View>
  );
}
