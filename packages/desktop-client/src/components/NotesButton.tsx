import React, { useEffect, useRef, useState, type ComponentProps } from 'react';
import { Popover } from 'react-aria-components';

import { useLiveQuery } from 'loot-core/src/client/query-hooks';
import { send } from 'loot-core/src/platform/client/fetch';
import { q } from 'loot-core/src/shared/query';
import { type NoteEntity } from 'loot-core/types/models';

import { SvgCustomNotesPaper } from '../icons/v2';
import { type CSSProperties, styles, theme } from '../style';

import { Button } from './common/Button';
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
  const data = useLiveQuery<NoteEntity[]>(
    () => q('notes').filter({ id }).select('*'),
    [id],
  );
  const note = data && data.length > 0 ? data[0].note : '';
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
          <SvgCustomNotesPaper style={{ width, height }} />
        </Button>
      </View>

      <Popover
        triggerRef={triggerRef}
        isOpen={isOpen}
        onOpenChange={onClose}
        placement={tooltipPosition}
        style={{ ...styles.tooltip, marginTop: -8 }}
      >
        <Notes notes={tempNotes} editable focused onChange={setTempNotes} />
      </Popover>
    </Tooltip>
  );
}
