import React, { Fragment } from 'react';

import { useResponsive } from '@actual-app/components/hooks/useResponsive';

import { DesktopLinkedNotes } from './DesktopLinkedNotes';
import { DesktopTaggedNotes } from './DesktopTaggedNotes';
import { parseNotes, removeTagFromNotes } from './linkParser';
import { MobileLinkedNotes } from './MobileLinkedNotes';
import { MobileTaggedNotes } from './MobileTaggedNotes';

type NotesTagFormatterProps = {
  notes: string;
  onNotesTagClick?: (tag: string) => void;
  /**
   * Called with the updated notes when a tag is removed. When omitted, tags
   * can't be removed.
   */
  onNotesChange?: (notes: string) => void;
};

export function NotesTagFormatter({
  notes,
  onNotesTagClick,
  onNotesChange,
}: NotesTagFormatterProps) {
  const { isNarrowWidth } = useResponsive();

  const segments = parseNotes(notes);

  return (
    <>
      {segments.map((segment, index) => {
        const isLast = index === segments.length - 1;
        const nextSegment = segments[index + 1];
        // Add separator (space) after segment if next segment doesn't start with whitespace
        const separator =
          isLast ||
          (nextSegment?.type === 'text' && /^\s/.test(nextSegment.content))
            ? ''
            : ' ';

        switch (segment.type) {
          case 'text':
            return <Fragment key={index}>{segment.content}</Fragment>;

          case 'tag':
            if (isNarrowWidth) {
              return (
                <MobileTaggedNotes
                  key={index}
                  content={segment.content}
                  tag={segment.tag}
                  separator={separator}
                />
              );
            }
            return (
              <DesktopTaggedNotes
                key={index}
                onPress={onNotesTagClick}
                onRemove={
                  onNotesChange &&
                  (() => onNotesChange(removeTagFromNotes(notes, segment)))
                }
                content={segment.content}
                tag={segment.tag}
                separator={separator}
              />
            );

          case 'link':
            if (isNarrowWidth) {
              return (
                <MobileLinkedNotes
                  key={index}
                  displayText={segment.displayText}
                  url={segment.url}
                  separator={separator}
                  isFilePath={segment.isFilePath}
                />
              );
            }
            return (
              <DesktopLinkedNotes
                key={index}
                displayText={segment.displayText}
                url={segment.url}
                separator={separator}
                isFilePath={segment.isFilePath}
              />
            );

          default:
            return null;
        }
      })}
    </>
  );
}
