import { useCallback } from 'react';

import { theme as themeStyle } from '@actual-app/components/theme';
import { css } from '@emotion/css';

import type { Theme } from 'loot-core/types/prefs';

import { useTags } from './useTags';

import { useTheme } from '@desktop-client/style';

export function useTagCSS() {
  const { data: tags = [] } = useTags();
  const [theme] = useTheme();

  return useCallback(
    (
      tag: string,
      options: { color?: string | null; compact?: boolean } = {},
    ) => {
      const [color, backgroundColor, backgroundColorHovered] = getTagCSSColors(
        theme,
        // fallback strategy: options color > tag color > default color > theme color (undefined)
        options.color ?? tags.find(t => t.tag === tag)?.color,
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
    [theme, tags],
  );
}

function getTagCSSColors(theme: Theme, color?: string | null) {
  if (!color) {
    return [
      themeStyle.noteTagText,
      themeStyle.noteTagBackground,
      themeStyle.noteTagBackgroundHover,
    ];
  }

  // see: https://www.w3.org/TR/AERT/#color-contrast
  const r = parseInt(color.substring(1, 3), 16);
  const g = parseInt(color.substring(3, 5), 16);
  const b = parseInt(color.substring(5, 7), 16);
  const brightnessDiff = (r * 299 + g * 587 + b * 114) / 1000;

  if (brightnessDiff >= 125) {
    // !important is used to override the hover text color in button.tsx used to style the tag button
    return [
      'black !important',
      color,
      `color-mix(in srgb, ${color} 80%, black)`,
    ];
  }

  return ['white !important', color, `color-mix(in srgb, ${color} 70%, white)`];
}
