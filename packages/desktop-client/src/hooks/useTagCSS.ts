import { useCallback } from 'react';

import { theme as themeStyle } from '@actual-app/components/theme';
import type { Theme } from '@actual-app/core/types/prefs';
import { css } from '@emotion/css';

import { useTheme } from '#style';

import { useTags } from './useTags';

export function useTagCSS(opts?: { ellipsis?: boolean }) {
  const { data: tags = [] } = useTags();
  const [theme] = useTheme();

  return useCallback(
    (
      tag: string,
      options: { color?: string | null; compact?: boolean } = {},
    ) => {
      const tagObj = tags.find(t => t.tag === tag);
      const { color, backgroundColor, backgroundColorHovered, isCustomColor } =
        getTagCSSColors(
          theme,
          // fallback strategy: options color > tag color > default color > theme color (undefined)
          options.color ?? tagObj?.color,
        );

      return css({
        ...(opts?.ellipsis
          ? {
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: '100%',
              display: 'inline-block',
              whiteSpace: 'nowrap',
            }
          : { display: 'inline-flex' }),
        opacity: tagObj?.hidden ? 0.5 : undefined,
        padding: options.compact ? '0px 7px' : '3px 7px',
        borderRadius: 16,
        userSelect: 'none',
        backgroundColor,
        // !important is used to override the hover text color in button.tsx used to style the tag button
        color: isCustomColor ? `${color} !important` : color,
        cursor: 'pointer',
        '&[data-hovered]': {
          backgroundColor: backgroundColorHovered,
        },
        '&[data-pressed]': {
          backgroundColor: backgroundColorHovered,
        },
      });
    },
    [theme, tags, opts],
  );
}

type TagColors = {
  color: string;
  backgroundColor: string;
  backgroundColorHovered: string;
  isHidden: boolean;
};

/**
 * Returns a getter for a tag's raw pill colours, for callers that need to
 * build styles around the pill rather than use the pill class itself.
 */
export function useTagColors() {
  const { data: tags = [] } = useTags();
  const [theme] = useTheme();

  return (tag: string): TagColors => {
    const tagObj = tags.find(t => t.tag === tag);
    const { color, backgroundColor, backgroundColorHovered } = getTagCSSColors(
      theme,
      tagObj?.color,
    );

    return {
      color,
      backgroundColor,
      backgroundColorHovered,
      isHidden: Boolean(tagObj?.hidden),
    };
  };
}

function getTagCSSColors(theme: Theme, color?: string | null) {
  if (!color) {
    return {
      color: themeStyle.noteTagText,
      backgroundColor: themeStyle.noteTagBackground,
      backgroundColorHovered: themeStyle.noteTagBackgroundHover,
      isCustomColor: false,
    };
  }

  // see: https://www.w3.org/TR/AERT/#color-contrast
  const r = parseInt(color.substring(1, 3), 16);
  const g = parseInt(color.substring(3, 5), 16);
  const b = parseInt(color.substring(5, 7), 16);
  const brightnessDiff = (r * 299 + g * 587 + b * 114) / 1000;

  if (brightnessDiff >= 125) {
    return {
      color: 'black',
      backgroundColor: color,
      backgroundColorHovered: `color-mix(in srgb, ${color} 80%, black)`,
      isCustomColor: true,
    };
  }

  return {
    color: 'white',
    backgroundColor: color,
    backgroundColorHovered: `color-mix(in srgb, ${color} 70%, white)`,
    isCustomColor: true,
  };
}
