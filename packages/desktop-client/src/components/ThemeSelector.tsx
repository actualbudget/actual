import {
  type CSSProperties,
  type SVGProps,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';

import type { Theme } from 'loot-core/src/types/prefs';

import { type ThemeDefinition } from '../../../plugins-shared/src';
import { SvgMoonStars, SvgSun, SvgSystem } from '../icons/v2';
import { themeOptions, themes, useTheme } from '../style';

import { useActualPlugins } from './ActualPluginsProvider';
import { Button } from './common/Button2';
import { Menu } from './common/Menu';
import { Popover } from './common/Popover';
import { View } from './common/View';
import { useResponsive } from './responsive/ResponsiveProvider';

type ThemeSelectorProps = {
  style?: CSSProperties;
};

type ThemesExtendedType = {
  [key: string]: {
    name: string;
    colors: ThemeDefinition;
  };
};

type ThemesIconsType = {
  [key: string]: (props: SVGProps<SVGSVGElement>) => JSX.Element;
};

export function ThemeSelector({ style }: ThemeSelectorProps) {
  const [theme, switchTheme] = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const triggerRef = useRef(null);
  const [themesExtended, setThemesExtended] =
    useState<ThemesExtendedType>(themes);
  const [themeOptionsExtended, setThemeOptionsExtended] =
    useState(themeOptions);

  const { isNarrowWidth } = useResponsive();
  const { t } = useTranslation();

  const baseIcons = useMemo(
    () => ({
      light: SvgSun,
      dark: SvgMoonStars,
      auto: SvgSystem,
      midnight: SvgMoonStars,
      development: SvgMoonStars,
    }),
    [],
  );
  const [themeIcons, setThemeIcons] = useState<ThemesIconsType>(baseIcons);
  const { plugins: loadedPlugins } = useActualPlugins();

  useEffect(() => {
    const pluginIcons =
      loadedPlugins?.reduce((acc, plugin) => {
        if (plugin.availableThemes?.length) {
          plugin.availableThemes().forEach(theme => {
            acc = {
              ...acc,
              [theme]: (props: SVGProps<SVGSVGElement>) =>
                plugin?.getThemeIcon?.(theme, props.style) ?? <View />,
            };
          });
        }
        return acc;
      }, {} as ThemesIconsType) ?? ({} as ThemesIconsType);

    const customThemes =
      loadedPlugins?.reduce((acc, plugin) => {
        if (plugin.availableThemes?.length) {
          plugin
            .availableThemes()
            .filter(theme => theme !== undefined)
            .forEach(theme => {
              acc = {
                ...acc,
                [theme]: {
                  name: theme,
                  colors: plugin?.getThemeSchema?.(theme) ?? {},
                },
              };
            });
        }
        return acc;
      }, {} as ThemesExtendedType) ?? ({} as ThemesExtendedType);

    setThemeIcons({ ...baseIcons, ...pluginIcons });

    setThemesExtended({ ...themes, ...customThemes });
  }, [loadedPlugins, baseIcons]);

  useEffect(() => {
    setThemeOptionsExtended(
      Object.entries(themesExtended).map(
        ([key, { name }]) => [key, name] as [Theme, string],
      ),
    );
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
