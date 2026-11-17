import { useLayoutEffect, useRef, useState } from 'react';
import type { UIEvent } from 'react';

import { theme } from '@actual-app/components/theme';
import { spacing } from '@actual-app/components/tokens';
import { View } from '@actual-app/components/view';

import { Notes } from '#components/Notes';

const NOTES_MAX_HEIGHT = 120;
const SCROLL_SHADOW_HEIGHT = spacing.xl;

type MobileSheetNotesProps = {
  notes: string;
};

function hasContentBelow(element: HTMLDivElement) {
  return element.scrollHeight - element.scrollTop - element.clientHeight > 1;
}

export function MobileSheetNotes({ notes }: MobileSheetNotesProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [hasMoreBelow, setHasMoreBelow] = useState(false);

  useLayoutEffect(() => {
    if (scrollRef.current) {
      setHasMoreBelow(hasContentBelow(scrollRef.current));
    }
  }, [notes]);

  return (
    <View style={{ position: 'relative', flexShrink: 0 }}>
      <View
        innerRef={scrollRef}
        onScroll={(event: UIEvent<HTMLDivElement>) =>
          setHasMoreBelow(hasContentBelow(event.currentTarget))
        }
        style={{
          maxHeight: NOTES_MAX_HEIGHT,
          overflowY: 'auto',
          padding: `0 ${spacing.sm}px`,
        }}
      >
        <Notes
          notes={notes}
          editable={false}
          focused={false}
          getStyle={() => ({ borderRadius: 6, color: theme.pageText })}
        />
      </View>
      <View
        aria-hidden
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: SCROLL_SHADOW_HEIGHT,
          pointerEvents: 'none',
          background: `linear-gradient(to bottom, transparent, ${theme.modalBackground})`,
          opacity: hasMoreBelow ? 1 : 0,
          transition: 'opacity 150ms ease',
        }}
      />
    </View>
  );
}
