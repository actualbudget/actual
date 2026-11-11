import React from 'react';
import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { useResponsive } from '@actual-app/components/hooks/useResponsive';
import { SvgMoonStars, SvgSun } from '@actual-app/components/icons/v2';
import { Tooltip } from '@actual-app/components/tooltip';
import type { Theme } from '@actual-app/core/types/prefs';

import { useTheme } from '#style';

/**
 * The themes the top bar toggle cycles through, in order. "System default"
 * is intentionally not part of the cycle: it can still be picked from the
 * settings page, and clicking the toggle while it is active moves on to the
 * first explicit theme.
 */
export const THEME_TOGGLE_ORDER = ['light', 'dark', 'midnight'] as const;

export type ToggleableTheme = (typeof THEME_TOGGLE_ORDER)[number];

export function isToggleableTheme(theme: Theme): theme is ToggleableTheme {
  return (THEME_TOGGLE_ORDER as readonly string[]).includes(theme);
}

export function getNextTheme(current: Theme): ToggleableTheme {
  if (!isToggleableTheme(current)) {
    return THEME_TOGGLE_ORDER[0];
  }
  const index = THEME_TOGGLE_ORDER.indexOf(current);
  return THEME_TOGGLE_ORDER[(index + 1) % THEME_TOGGLE_ORDER.length];
}

const themeIcons = {
  light: SvgSun,
  dark: SvgMoonStars,
  midnight: SvgMoonStars,
} as const;

type ThemeSelectorProps = {
  style?: CSSProperties;
};

export function ThemeSelector({ style }: ThemeSelectorProps) {
  const [theme, switchTheme] = useTheme();
  const { isNarrowWidth } = useResponsive();
  const { t } = useTranslation();

  if (isNarrowWidth) {
    return null;
  }

  const themeLabels: Record<ToggleableTheme, string> = {
    light: t('Light'),
    dark: t('Dark'),
    midnight: t('Midnight'),
  };

  const currentLabel = isToggleableTheme(theme)
    ? themeLabels[theme]
    : t('System default');
  const nextTheme = getNextTheme(theme);
  const Icon = isToggleableTheme(theme) ? themeIcons[theme] : SvgSun;

  return (
    <Tooltip
      placement="bottom end"
      content={t('Theme: {{current}}. Click to switch to {{next}}.', {
        current: currentLabel,
        next: themeLabels[nextTheme],
      })}
    >
      <Button
        variant="bare"
        aria-label={t('Switch theme (current: {{current}})', {
          current: currentLabel,
        })}
        data-testid="theme-toggle"
        data-theme={theme}
        onPress={() => switchTheme(nextTheme)}
        style={style}
      >
        <Icon style={{ width: 13, height: 13, color: 'inherit' }} />
      </Button>
    </Tooltip>
  );
}
