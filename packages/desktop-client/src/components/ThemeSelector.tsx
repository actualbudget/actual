import React, { useRef, useState, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { useResponsive } from '@actual-app/components/hooks/useResponsive';
import {
  SvgMoonStars,
  SvgSun,
  SvgSystem,
} from '@actual-app/components/icons/v2';
import { Menu } from '@actual-app/components/menu';
import { Popover } from '@actual-app/components/popover';

import type { Theme } from 'loot-core/types/prefs';

import { getThemeOptions, useTheme } from '../style';
import { useActualPlugins } from '../plugin/ActualPluginsProvider';
import { useGlobalPref } from '../hooks/useGlobalPref';

type ThemeSelectorProps = {
  style?: CSSProperties;
};

export function ThemeSelector({ style }: ThemeSelectorProps) {
  const [theme, switchTheme] = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const triggerRef = useRef(null);

  const { isNarrowWidth } = useResponsive();
  const { t } = useTranslation();

  // Get saved plugin themes
  const [savedPluginThemes] = useGlobalPref('pluginThemes');

  // Get theme options including plugin themes
  let themeOptions = getThemeOptions(undefined, savedPluginThemes);
  try {
    const plugins = useActualPlugins();
    themeOptions = getThemeOptions(plugins.getPluginThemes, savedPluginThemes);
  } catch {
    // Fallback to built-in themes + saved plugin themes only
  }

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

  const Icon = themeIcons[theme as keyof typeof themeIcons] || SvgSun;

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
