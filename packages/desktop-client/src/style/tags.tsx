import React, { useCallback } from 'react';

import { Button } from '@actual-app/components/button';
import { useResponsive } from '@actual-app/components/hooks/useResponsive';
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
  const { isNarrowWidth } = useResponsive();

  return useCallback(
    (tag: string) => {
      const [color, backgroundColor, backgroundColorHovered] = getTagColors(
        theme,
        tagsColors[tag],
      );

      return css({
        display: 'inline-flex',
        padding: isNarrowWidth ? '0px 7px' : '3px 7px',
        borderRadius: 16,
        userSelect: 'none',
        backgroundColor,
        color,
        cursor: 'pointer',
        '&[data-hovered]': {
          backgroundColor: backgroundColorHovered,
        },
      });
    },
    [theme, tagsColors, isNarrowWidth],
  );
}

function DesktopTaggedNotes({
  content,
  onPress,
  tag,
  separator,
}: {
  content: string;
  onPress?: (content: string) => void;
  tag: string;
  separator: string;
}) {
  const getTagCSS = useTagCSS();
  return (
    <span>
      <Button
        variant="bare"
        className={getTagCSS(tag)}
        onPress={() => {
          onPress?.(content);
        }}
      >
        {content}
      </Button>
      {separator}
    </span>
  );
}

function MobileTaggedNotes({
  content,
  tag,
  separator,
}: {
  content: string;
  tag: string;
  separator: string;
}) {
  const getTagCSS = useTagCSS();
  return (
    <>
      <span className={getTagCSS(tag)}>{content}</span>
      {separator}
    </>
  );
}

export function NotesTagFormatter({
  notes,
  onNotesTagClick,
}: {
  notes: string;
  onNotesTagClick?: (tag: string) => void;
}) {
  const { isNarrowWidth } = useResponsive();

  const words = notes.split(' ');
  return (
    <>
      {words.map((word, i, arr) => {
        const separator = arr.length - 1 === i ? '' : ' ';
        if (word.includes('#') && word.length > 1) {
          let lastEmptyTag = -1;
          // Treat tags in a single word as separate tags.
          // #tag1#tag2 => (#tag1)(#tag2)
          // not-a-tag#tag2#tag3 => not-a-tag(#tag2)(#tag3)
          return word.split('#').map((tag, ti) => {
            if (ti === 0) {
              return tag;
            }

            if (!tag) {
              lastEmptyTag = ti;
              return '#';
            }

            if (lastEmptyTag === ti - 1) {
              return `${tag} `;
            }
            lastEmptyTag = -1;

            const validTag = `#${tag}`;

            if (isNarrowWidth) {
              return (
                <MobileTaggedNotes
                  key={`${validTag}${ti}`}
                  content={validTag}
                  tag={tag}
                  separator={separator}
                />
              );
            } else {
              return (
                <DesktopTaggedNotes
                  key={`${validTag}${ti}`}
                  onPress={onNotesTagClick}
                  content={validTag}
                  tag={tag}
                  separator={separator}
                />
              );
            }
          });
        }
        return `${word}${separator}`;
      })}
    </>
  );
}
