import React from 'react';
import { useTranslation } from 'react-i18next';

import { SvgCog, SvgReports, SvgWallet } from '@actual-app/components/icons/v1';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { Link } from '#components/common/Link';

import type { WidthMode } from './widthMode';

const inactiveTileStyle = {
  color: theme.pageTextSubdued,
  border: `1px solid transparent`,
  backgroundColor: 'transparent',
};

const activeTileStyle = {
  color: theme.pillTextSelected,
  backgroundColor: theme.pillBackgroundSelected,
  border: `1px solid ${theme.pillBorderSelected}`,
};

export function NavTiles({ widthMode }: { widthMode: WidthMode }) {
  const { t } = useTranslation();

  const tiles = [
    { to: '/budget', label: t('Budget'), Icon: SvgWallet },
    { to: '/reports', label: t('Reports'), Icon: SvgReports },
    { to: '/settings', label: t('Settings'), Icon: SvgCog },
  ];

  if (widthMode === 'rail') {
    return (
      <View style={{ flexDirection: 'column', gap: 4, padding: '0 12px' }}>
        {tiles.map(({ to, label, Icon }) => (
          <Link
            key={to}
            variant="internal"
            to={to}
            aria-label={label}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 44,
              height: 36,
              borderRadius: 6,
              textDecoration: 'none',
              ...inactiveTileStyle,
              ':hover': { backgroundColor: theme.sidebarItemBackgroundHover },
            }}
            activeStyle={activeTileStyle}
          >
            <Icon width={18} height={18} />
          </Link>
        ))}
      </View>
    );
  }

  const iconSize = widthMode === 'full' ? 19 : 17;

  return (
    <View
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 6,
        padding: '0 12px',
      }}
    >
      {tiles.map(({ to, label, Icon }) => (
        <Link
          key={to}
          variant="internal"
          to={to}
          aria-label={widthMode === 'compact' ? label : undefined}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 4,
            padding: widthMode === 'full' ? '10px 2px' : '8px 0',
            borderRadius: 6,
            textDecoration: 'none',
            ...inactiveTileStyle,
            ':hover': { backgroundColor: theme.sidebarItemBackgroundHover },
          }}
          activeStyle={activeTileStyle}
        >
          <Icon width={iconSize} height={iconSize} />
          {widthMode === 'full' && (
            <span style={{ fontSize: 10.5, fontWeight: 500 }}>{label}</span>
          )}
        </Link>
      ))}
    </View>
  );
}
