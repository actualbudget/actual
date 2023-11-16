import React, { useState } from 'react';

import type { Theme } from 'loot-core/src/types/prefs';

import { useActions } from '../hooks/useActions';
import MoonStars from '../icons/v2/MoonStars';
import Sun from '../icons/v2/Sun';
import System from '../icons/v2/System';
import { useResponsive } from '../ResponsiveProvider';
import { themeOptions, useTheme } from '../style';

import Button from './common/Button';
import Menu from './common/Menu';
import { Tooltip } from './tooltips';

export function ThemeSelector() {
  let theme = useTheme();
  let { saveGlobalPrefs } = useActions();
  let [menuOpen, setMenuOpen] = useState(false);

  let { isNarrowWidth } = useResponsive();

  const themeIcons = { light: Sun, dark: MoonStars, auto: System } as const;

  async function onMenuSelect(newTheme: Theme) {
    setMenuOpen(false);

    saveGlobalPrefs({
      theme: newTheme,
    });
  }

  const Icon = themeIcons?.[theme] || Sun;

  return isNarrowWidth ? null : (
    <Button type="bare" onClick={() => setMenuOpen(true)}>
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
