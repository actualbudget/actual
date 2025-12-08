import React from 'react';

import { useResponsive } from '@actual-app/components/hooks/useResponsive';

import { DesktopLinkedNotes } from './DesktopLinkedNotes';
import { DesktopTaggedNotes } from './DesktopTaggedNotes';
import { parseNotes } from './linkParser';
import { MobileLinkedNotes } from './MobileLinkedNotes';
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
            return (
              <React.Fragment key={index}>{segment.content}</React.Fragment>
            );

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
