import React, { useState } from 'react';

import type { Theme } from 'loot-core/src/types/prefs';

import { SvgMoonStars, SvgSun, SvgSystem } from '../icons/v2';
import { useResponsive } from '../ResponsiveProvider';
import { type CSSProperties, themeOptions, useTheme } from '../style';

import { Button } from './common/Button';
import { Menu } from './common/Menu';
import { Tooltip } from './tooltips';

type ThemeSelectorProps = {
  style?: CSSProperties;
};

export function ThemeSelector({ style }: ThemeSelectorProps) {
  const [theme, switchTheme] = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);

  const { isNarrowWidth } = useResponsive();

  const themeIcons = {
    light: SvgSun,
    dark: SvgMoonStars,
    auto: SvgSystem,
  } as const;

  async function onMenuSelect(newTheme: string) {
    setMenuOpen(false);
    switchTheme(newTheme as Theme);
  }

  const Icon = themeIcons[theme] || SvgSun;

  return isNarrowWidth ? null : (
    <Button
      type="bare"
      aria-label="Switch theme"
      onClick={() => setMenuOpen(true)}
      style={style}
    >
      <Icon style={{ width: 13, height: 13, color: 'inherit' }} />
      {menuOpen && (
        <Tooltip
          position="bottom-right"
          style={{ padding: 0 }}
          onClose={() => setMenuOpen(false)}
        >
          <Menu
            onMenuSelect={onMenuSelect}
            items={themeOptions.map(([name, text]) => ({ name, text }))}
          />
        </Tooltip>
      )}
    </Button>
  );
}
