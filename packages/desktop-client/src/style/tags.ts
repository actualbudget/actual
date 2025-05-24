import React, { useCallback } from 'react';

import { theme as themeStyle } from '@actual-app/components/theme';
import { css } from '@emotion/css';

import { type Theme } from 'loot-core/types/prefs';

import { useTheme } from './theme';

import { useSyncedPref } from '@desktop-client/hooks/useSyncedPref';

type TagColors = Record<string, string>;

export function useTags() {
  const [tags = '{}', setTagsPref] = useSyncedPref('tags');
  return [
    JSON.parse(tags) as TagColors,
    (tags: TagColors) => setTagsPref(JSON.stringify(tags)),
  ] as const;
}

function getTagColors(theme: Theme, color?: string) {
  if (theme === 'light') {
    return [
      color ? `${color} !important` : themeStyle.noteTagText,
      color ? `rgb(from ${color} r g b / 0.15)` : themeStyle.noteTagBackground,
      color
        ? `rgb(from ${color} r g b / 0.25)`
        : themeStyle.noteTagBackgroundHover,
    ];
  } else {
    return [
      themeStyle.noteTagText,
      color ? `rgb(from ${color} r g b / 0.75)` : themeStyle.noteTagBackground,
      color ? `rgb(from ${color} r g b)` : themeStyle.noteTagBackgroundHover,
    ];
  }
}

export function useTagCSS() {
  const [tagsColors] = useTags();
  const [theme] = useTheme();

  return useCallback(
    (tag: string, options: { color?: string; compact?: boolean } = {}) => {
      const [color, backgroundColor, backgroundColorHovered] = getTagColors(
        theme,
        // fallback strategy: options color > tag color > default color > theme color (undefined)
        options.color ?? tagsColors[tag] ?? tagsColors['*'],
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
    [theme, tagsColors],
  );
}

export function useTagColor() {
  const [tagsColors] = useTags();

  return useCallback(
    (tag: string) => {
      return tagsColors[tag];
    },
    [tagsColors],
  );
}
