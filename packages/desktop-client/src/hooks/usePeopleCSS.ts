import { useCallback } from 'react';

import { theme as themeStyle } from '@actual-app/components/theme';
import { css } from '@emotion/css';

import { type Theme } from 'loot-core/types/prefs';

import { usePeople } from './usePeople';

import { useTheme } from '@desktop-client/style';

export function usePeopleCSS() {
  const people = usePeople();
  const [theme] = useTheme();

  return useCallback(
    (
      person: string,
      options: { color?: string | null; compact?: boolean } = {},
    ) => {
      const [color, backgroundColor, backgroundColorHovered] =
        getPeopleCSSColors(
          theme,
          // fallback strategy: options color > person color > default color > theme color (undefined)
          options.color ?? people.find(p => p.tag === person)?.color,
        );

      return css({
        display: 'inline-flex',
        padding: options.compact ? '0px 7px' : '3px 7px',
        borderRadius: 16,
        userSelect: 'none',
        backgroundColor,
        color,
        cursor: 'pointer',
        '&[data-hovered]': {
          backgroundColor: backgroundColorHovered,
        },
        '&[data-pressed]': {
          backgroundColor: backgroundColorHovered,
        },
      });
    },
    [theme, people],
  );
}

function getContrastedColor(hexcolor: string) {
  // see: https://www.w3.org/TR/AERT/#color-contrast
  const r = parseInt(hexcolor.substring(1, 3), 16);
  const g = parseInt(hexcolor.substring(3, 5), 16);
  const b = parseInt(hexcolor.substring(5, 7), 16);
  const brightnessDiff = (r * 299 + g * 587 + b * 114) / 1000;

  return brightnessDiff >= 125 ? 'black' : 'white';
}

function getPeopleCSSColors(theme: Theme, color?: string | null) {
  if (!color) {
    return [
      themeStyle.notePeopleText,
      themeStyle.notePeopleBackground,
      themeStyle.notePeopleBackgroundHover,
    ];
  }

  return [
    getContrastedColor(color),
    color,
    `color-mix(in srgb, ${color} 85%, white)`,
  ];
}
