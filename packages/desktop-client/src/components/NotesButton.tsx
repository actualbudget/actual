import React, { createRef, useState, useEffect } from 'react';

import { type CSSProperties, css } from 'glamor';

import q from 'loot-core/src/client/query-helpers';
import { useLiveQuery } from 'loot-core/src/client/query-hooks';
import { send } from 'loot-core/src/platform/client/fetch';

import CustomNotesPaper from '../icons/v2/CustomNotesPaper';
import { colors } from '../style';

import { View, Button, Tooltip, useTooltip, Text } from './common';

type NotesTooltipProps = {
  editable?: boolean;
  defaultNotes?: string;
  position?: string;
  onClose?: (notes: string) => void;
};
function NotesTooltip({
  editable,
  defaultNotes,
  position = 'bottom-left',
  onClose,
}: NotesTooltipProps) {
  let [notes, setNotes] = useState<string>(defaultNotes);
  let inputRef = createRef<HTMLTextAreaElement>();

  useEffect(() => {
    if (editable) {
      inputRef.current.focus();
    }
  }, [inputRef, editable]);

  return (
    <Tooltip position={position} onClose={() => onClose(notes)}>
      {editable ? (
        <textarea
          ref={inputRef}
          {...css({
            border: '1px solid ' + colors.border,
            padding: 7,
            minWidth: 300,
            minHeight: 120,
            outline: 'none',
          })}
          value={notes || ''}
          onChange={e => setNotes(e.target.value)}
        ></textarea>
      ) : (
        <Text
          {...css({
            display: 'block',
            maxWidth: 225,
            padding: 8,
            whiteSpace: 'pre-wrap',
            overflowWrap: 'break-word',
          })}
        >
          {notes}
        </Text>
      )}
    </Tooltip>
  );
}

type NotesButtonProps = {
  id: string;
  width?: number;
  height?: number;
  defaultColor?: string;
  tooltipPosition?: string;
  style?: CSSProperties;
};
export default function NotesButton({
  id,
  width = 12,
  height = 12,
  defaultColor = colors.n8,
  tooltipPosition,
  style,
}: NotesButtonProps) {
  let [hover, setHover] = useState(false);
  let tooltip = useTooltip();
  let data = useLiveQuery(() => q('notes').filter({ id }).select('*'), [id]);
  let note = data && data.length > 0 ? data[0].note : null;
  let hasNotes = note && note !== '';

  function onClose(notes) {
    send('notes-save', { id, note: notes });
    tooltip.close();
  }

  const [delayHandler, setDelayHandler] = useState(null);

  const handleMouseEnter = () => {
    setDelayHandler(
      setTimeout(() => {
        setHover(true);
      }, 300),
    );
  };

  const handleMouseLeave = () => {
    clearTimeout(delayHandler);
    setHover(false);
  };

  // This account for both the tooltip hover, and editing tooltip
  const tooltipOpen = tooltip.isOpen || (hasNotes && hover);

  return (
    <View
      style={[{ flexShrink: 0 }]}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <Button
        bare
        className={!hasNotes && !tooltipOpen ? 'hover-visible' : ''}
        style={[
          { color: defaultColor },
          style,
          hasNotes && { display: 'flex !important' },
          tooltipOpen && { color: colors.n1 },
        ]}
        {...tooltip.getOpenEvents()}
      >
        <CustomNotesPaper style={{ width, height, color: 'currentColor' }} />
      </Button>
      {tooltipOpen && (
        <NotesTooltip
          editable={tooltip.isOpen}
          defaultNotes={note}
          position={tooltipPosition}
          onClose={onClose}
        />
      )}
    </View>
  );
}
