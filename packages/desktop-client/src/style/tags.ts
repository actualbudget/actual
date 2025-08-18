import React, { useCallback, useEffect } from 'react';

import { theme as themeStyle } from '@actual-app/components/theme';
import { css } from '@emotion/css';

import { type Theme } from 'loot-core/types/prefs';

import { useTheme } from './theme';

import { getTags } from '@desktop-client/queries/queriesSlice';
import { useDispatch, useSelector } from '@desktop-client/redux';

export function useTags() {
  const dispatch = useDispatch();
  const tags = useSelector(state => state.queries.tags);
  const tagsLoaded = useSelector(state => state.queries.tagsLoaded);

  useEffect(() => {
    if (!tagsLoaded) {
      dispatch(getTags());
    }
  }, [tagsLoaded, dispatch]);

  return tags;
}

function getContrastedColor(hexcolor: string) {
  // see: https://www.w3.org/TR/AERT/#color-contrast
  const r = parseInt(hexcolor.substring(1, 3), 16);
  const g = parseInt(hexcolor.substring(3, 5), 16);
  const b = parseInt(hexcolor.substring(5, 7), 16);
  const brightnessDiff = (r * 299 + g * 587 + b * 114) / 1000;

  return brightnessDiff >= 125 ? 'black' : 'white';
}

function getTagCSSColors(theme: Theme, color?: string | null) {
  if (!color) {
    return [
      themeStyle.noteTagText,
      themeStyle.noteTagBackground,
      themeStyle.noteTagBackgroundHover,
    ];
  }

  if (theme === 'auto') {
    theme = window.matchMedia('(prefers-color-scheme: light)').matches
      ? 'light'
      : 'dark';
  }

  if (theme === 'light') {
    return [
      `${color} !important`,
      `color-mix(in srgb, ${color} 15%, white)`,
      `color-mix(in srgb, ${color} 25%, white)`,
    ];
  } else {
    return [
      getContrastedColor(color),
      color,
      `color-mix(in srgb, ${color} 85%, white)`,
    ];
  }
}

export function useTagCSS() {
  const tags = useTags();
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
