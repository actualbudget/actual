import React, { ReactNode, useEffect, useRef, useState, type CSSProperties } from 'react';

import { t } from 'i18next';

import type { Theme } from 'loot-core/src/types/prefs';

import { SvgMoonStars, SvgSun, SvgSystem } from '../icons/v2';
import { themeOptions, themes, useTheme } from '../style';

import { Button } from './common/Button2';
import { Menu } from './common/Menu';
import { Popover } from './common/Popover';
import { useResponsive } from './responsive/ResponsiveProvider';
import { loadedPlugins } from '../pluginLoader';

type ThemeSelectorProps = {
  style?: CSSProperties;
};

export function ThemeSelector({ style }: ThemeSelectorProps) {
  const [theme, switchTheme] = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const triggerRef = useRef(null);
  const [themesExtended, setThemesExtended] = useState(themes);
  const [themeOptionsExtended, setThemeOptionsExtended] = useState(themeOptions);

  const { isNarrowWidth } = useResponsive();

  const baseIcons = {
    light: SvgSun,
    dark: SvgMoonStars,
    auto: SvgSystem,
    midnight: SvgMoonStars,
    development: SvgMoonStars,
  };
  const [themeIcons, setThemeIcons] = useState(baseIcons);

  useEffect(() => {
    debugger;

    const pluginIconsLight = loadedPlugins.reduce((acc, plugin) => {
      if (plugin.availableThemes?.length) {
        plugin.availableThemes(false).forEach(theme => {
          acc[theme] = (props: React.SVGProps<SVGSVGElement>) => plugin.getThemeIcon(theme, false, props.style);
        });
      }
      return acc;
    }, {});

    const pluginIconsDark = loadedPlugins.reduce((acc, plugin) => {
      if (plugin.availableThemes?.length) {
        plugin.availableThemes(true).forEach(theme => {
          acc[theme] = (props: React.SVGProps<SVGSVGElement>) => plugin.getThemeIcon(theme, true, props.style);
        });
      }
      return acc;
    }, {});

    const themesLight = loadedPlugins.reduce((acc, plugin) => {
      if (plugin.availableThemes?.length) {
        plugin.availableThemes(false).forEach(theme => {
          acc[theme] = { name: theme, colors: plugin.getThemeSchema(theme, false)};
        });
      }
      return acc;
    }, {});

    const themesDark = loadedPlugins.reduce((acc, plugin) => {
      if (plugin.availableThemes?.length) {
        plugin.availableThemes(true).forEach(theme => {
          acc[theme] = { name: theme, colors: plugin.getThemeSchema(theme, true)};
        });
      }
      return acc;
    }, {});

    setThemeIcons({ ...baseIcons, ...pluginIconsLight, ...pluginIconsDark });

    setThemesExtended({...themes, ...themesLight, ...themesDark})
  }, [loadedPlugins]);

  useEffect(() => {
    setThemeOptionsExtended(Object.entries(themesExtended).map(
      ([key, { name }]) => [key, name] as [Theme, string],
    ));
  }, [themesExtended]);

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
          items={themeOptionsExtended.map(([name, text]) => ({ name, text }))}
        />
      </Popover>
    </>
  );
}
