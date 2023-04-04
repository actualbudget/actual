import React, { useState, useEffect, useMemo } from 'react';

import { css } from 'glamor';

import q from 'loot-core/src/client/query-helpers';
import { useLiveQuery } from 'loot-core/src/client/query-hooks';
import { send } from 'loot-core/src/platform/client/fetch';

import CustomNotesPaper from '../icons/v2/CustomNotesPaper';
import { colors } from '../style';

import { View, Button, Tooltip, useTooltip, Text } from './common';

export function NotesTooltip({
  editable,
  defaultNotes,
  position = 'bottom-left',
  onClose,
}) {
  let [notes, setNotes] = useState(defaultNotes);
  let inputRef = React.createRef();

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

export default function NotesButton({
  id,
  width = 12,
  height = 12,
  defaultColor = colors.n8,
  tooltipPosition,
  style,
}) {
  let [hover, setHover] = useState(false);
  let tooltip = useTooltip();
  let { data } = useLiveQuery(
    useMemo(() => q('notes').filter({ id }).select('*'), [id]),
  );
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
