import React, { useState } from 'react';

import type { Theme } from 'loot-core/src/types/prefs';

import { useActions } from '../hooks/useActions';
import MoonStars from '../icons/v2/MoonStars';
import Sun from '../icons/v2/Sun';
import System from '../icons/v2/System';
import { useResponsive } from '../ResponsiveProvider';
import { type CSSProperties, themeOptions, useTheme } from '../style';

import { Button } from './common/Button';
import Menu from './common/Menu';
import { Tooltip } from './tooltips';

type ThemeSelectorProps = {
  style?: CSSProperties;
};

export function ThemeSelector({ style }: ThemeSelectorProps) {
  const theme = useTheme();
  const { saveGlobalPrefs } = useActions();
  const [menuOpen, setMenuOpen] = useState(false);

  const { isNarrowWidth } = useResponsive();

  const themeIcons = { light: Sun, dark: MoonStars, auto: System } as const;

  async function onMenuSelect(newTheme: string) {
    setMenuOpen(false);

    saveGlobalPrefs({
      theme: newTheme as Theme,
    });
  }

  const Icon = themeIcons?.[theme] || Sun;

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
