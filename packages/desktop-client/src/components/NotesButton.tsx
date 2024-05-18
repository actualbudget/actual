import React, { useEffect, useRef, useState, type ComponentProps } from 'react';

import { send } from 'loot-core/src/platform/client/fetch';

import { useNotes } from '../hooks/useNotes';
import { SvgCustomNotesPaper } from '../icons/v2';
import { type CSSProperties, theme } from '../style';

import { Button } from './common/Button';
import { Popover } from './common/Popover';
import { Tooltip } from './common/Tooltip';
import { View } from './common/View';
import { Notes } from './Notes';

type NotesButtonProps = {
  id: string;
  width?: number;
  height?: number;
  defaultColor?: string;
  tooltipPosition?: ComponentProps<typeof Tooltip>['placement'];
  style?: CSSProperties;
};
export function NotesButton({
  id,
  width = 12,
  height = 12,
  defaultColor = theme.buttonNormalText,
  tooltipPosition = 'bottom start',
  style,
}: NotesButtonProps) {
  const triggerRef = useRef(null);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const note = useNotes(id) || '';
  const hasNotes = note && note !== '';

  const [tempNotes, setTempNotes] = useState<string>(note);
  useEffect(() => setTempNotes(note), [note]);

  function onClose() {
    send('notes-save', { id, note: tempNotes });
    setIsOpen(false);
  }

  return (
    <Tooltip
      content={<Notes notes={note} />}
      placement={tooltipPosition}
      triggerProps={{
        isDisabled: !hasNotes || isOpen,
      }}
    >
      <View style={{ flexShrink: 0 }}>
        <Button
          ref={triggerRef}
          type="bare"
          aria-label="View notes"
          className={!hasNotes && !isOpen ? 'hover-visible' : ''}
          style={{
            color: defaultColor,
            ...style,
            ...(hasNotes && { display: 'flex !important' }),
            ...(isOpen && { color: theme.buttonNormalText }),
          }}
          onClick={event => {
            event.stopPropagation();
            setIsOpen(true);
          }}
        >
          <SvgCustomNotesPaper style={{ width, height, flexShrink: 0 }} />
        </Button>
      </View>

      <Popover
        triggerRef={triggerRef}
        isOpen={isOpen}
        onOpenChange={onClose}
        placement={tooltipPosition}
        style={{ padding: 4 }}
      >
        <Notes notes={tempNotes} editable focused onChange={setTempNotes} />
      </Popover>
    </Tooltip>
  );
}
