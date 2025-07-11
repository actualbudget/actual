import React from 'react';

import { useResponsive } from '@actual-app/components/hooks/useResponsive';

import { DesktopTaggedNotes } from './DesktopTaggedNotes';
import { MobileTaggedNotes } from './MobileTaggedNotes';

type NotesTagFormatterProps = {
  notes: string;
  onNotesTagClick?: (tag: string) => void;
};

export function NotesTagFormatter({
  notes,
  onNotesTagClick,
}: NotesTagFormatterProps) {
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
