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

function getTagCSSColors(theme: Theme, color?: string | null) {
  if (theme === 'auto') {
    theme = window.matchMedia('(prefers-color-scheme: light)').matches
      ? 'light'
      : 'dark';
  }

  if (theme === 'light') {
    return [
      color ? `${color} !important` : themeStyle.noteTagText,
      color
        ? `color-mix(in srgb, ${color} 15%, white)`
        : themeStyle.noteTagBackground,
      color
        ? `color-mix(in srgb, ${color} 25%, white)`
        : themeStyle.noteTagBackgroundHover,
    ];
  } else {
    return [
      themeStyle.noteTagText,
      color ?? themeStyle.noteTagBackground,
      color
        ? `color-mix(in srgb, ${color} 85%, white)`
        : themeStyle.noteTagBackgroundHover,
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
