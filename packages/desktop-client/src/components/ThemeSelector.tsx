import React, { useRef, useState, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';

import type { Theme } from 'loot-core/src/types/prefs';

import { SvgMoonStars, SvgSun, SvgSystem } from '../icons/v2';
import { themeOptions, useTheme } from '../style';

import { Button } from './common/Button2';
import { Menu } from './common/Menu';
import { Popover } from './common/Popover';
import { useResponsive } from './responsive/ResponsiveProvider';

type ThemeSelectorProps = {
  style?: CSSProperties;
};

export function ThemeSelector({ style }: ThemeSelectorProps) {
  const [theme, switchTheme] = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const triggerRef = useRef(null);

  const { isNarrowWidth } = useResponsive();
  const { t } = useTranslation();

  const themeIcons = {
    light: SvgSun,
    dark: SvgMoonStars,
    auto: SvgSystem,
    midnight: SvgMoonStars,
    development: SvgMoonStars,
  } as const;

  function onMenuSelect(newTheme: Theme) {
    setMenuOpen(false);
    switchTheme(newTheme);
  }

  const Icon = themeIcons[theme] || SvgSun;

  if (isNarrowWidth) {
    return null;
  }

  return (
    <>
      <Button
        ref={triggerRef}
        variant="bare"
        aria-label={t('Switch theme')}
        onPress={() => setMenuOpen(true)}
        style={style}
      >
        <Icon style={{ width: 13, height: 13, color: 'inherit' }} />
      </Button>

      <Popover
        offset={8}
        triggerRef={triggerRef}
        isOpen={menuOpen}
        onOpenChange={() => setMenuOpen(false)}
      >
        <Menu
          onMenuSelect={onMenuSelect}
          items={themeOptions.map(([name, text]) => ({ name, text }))}
        />
      </Popover>
    </>
  );
}
