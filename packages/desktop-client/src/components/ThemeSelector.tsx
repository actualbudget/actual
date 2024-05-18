import React, { useRef, useState } from 'react';

import type { Theme } from 'loot-core/src/types/prefs';

import { SvgMoonStars, SvgSun, SvgSystem } from '../icons/v2';
import { useResponsive } from '../ResponsiveProvider';
import { type CSSProperties, themeOptions, useTheme } from '../style';

import { Button } from './common/Button';
import { Menu } from './common/Menu';
import { Popover } from './common/Popover';

type ThemeSelectorProps = {
  style?: CSSProperties;
};

export function ThemeSelector({ style }: ThemeSelectorProps) {
  const [theme, switchTheme] = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const triggerRef = useRef(null);

  const { isNarrowWidth } = useResponsive();

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
        type="bare"
        aria-label="Switch theme"
        onClick={() => setMenuOpen(true)}
        style={style}
      >
        <Icon style={{ width: 13, height: 13, color: 'inherit' }} />
      </Button>

      <Popover
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
