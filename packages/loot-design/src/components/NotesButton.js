import React, { useState, useEffect, useMemo } from 'react';

import { css } from 'glamor';

import q from 'loot-core/src/client/query-helpers';
import { useLiveQuery } from 'loot-core/src/client/query-hooks';
import { send } from 'loot-core/src/platform/client/fetch';

import { colors } from '../style';
import CustomNotesPaper from '../svg/v2/CustomNotesPaper';

import { View, Button, Tooltip, useTooltip, Text } from './common';

export function NotesTooltip({
  editable,
  defaultNotes,
  position = 'bottom-left',
  onClose
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
            outline: 'none'
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
            overflowWrap: 'break-word'
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
  style
}) {
  let [hover, setHover] = useState(false);
  let tooltip = useTooltip();
  let { data } = useLiveQuery(
    useMemo(() => q('notes').filter({ id }).select('*'), [id])
  );
  let note = data && data.length > 0 ? data[0].note : null;
  let hasNotes = note && note !== '';

  function onClose(notes) {
    send('notes-save', { id, note: notes });
    tooltip.close();
  }

  // This account for both the tooltip hover, and editing tooltip
  const tooltipOpen = tooltip.isOpen || (hasNotes && hover);

  return (
    <View
      style={[
        { flexShrink: 0 },
        tooltipOpen && {
          '& button, & .hover-visible': {
            display: 'flex',
            opacity: 1,
            color: colors.n1
          }
        },
        hasNotes && {
          '& button, & .hover-visible': { display: 'flex', opacity: 1 }
        }
      ]}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <Button
        bare
        className="hover-visible"
        style={[{ color: defaultColor }, style]}
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
